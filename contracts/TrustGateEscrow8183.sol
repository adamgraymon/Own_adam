// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TrustGateEscrow8183
 * @notice Contrato Inteligente No-Custodial estilo ERC-8183 para Comercio Agéntico en Base.
 * @dev Separación estricta de poderes:
 *      - `evaluator` (Wallet de IA) SOLO puede votar APROBADO o RECHAZADO. Jamás recibe fondos de usuarios.
 *      - `treasury` (Wallet fría del dueño) SOLO recibe la comisión del 1.5% cuando una entrega es aprobada.
 *      - Reloj Deadman Switch: si vence `expiresAt`, el comprador recupera el 100% sin permiso de nadie.
 */

interface IERC20Minimal {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract TrustGateEscrow8183 {
    enum JobState {
        None,
        Funded,
        Submitted,
        SettledApproved,
        RefundedRejected,
        RefundedExpired
    }

    struct Job {
        address buyer;
        address provider;
        uint256 usdcAmount;      // USDC tiene 6 decimales (5.00 USDC = 5_000_000)
        uint256 feeAmount;       // Comisión pactada al abrir la orden
        uint64 expiresAt;        // Timestamp límite (Deadman Switch)
        bytes32 deliverableHash; // Huella SHA-256 del dataset cifrado entregado por la Tienda IA
        bytes32 auditAttestation;// Huella EAS firmada por el Agente Interventor
        JobState state;
    }

    IERC20Minimal public immutable usdc;
    address public owner;
    address public evaluator;       // Wallet exclusiva de tu Agente Interventor IA
    address public treasury;        // Tu Wallet personal fría donde caen las ganancias en USDC

    uint256 public minOrderUsdc = 500_000;                  // 0.50 USDC piso técnico en contrato (permite Canary Test con poco saldo)
    uint256 public standardFeeBps = 150;                    // 1.50% (hasta 9.99 USDC)
    uint256 public volumeDiscountThresholdUsdc = 10_000_000;// 10.00 USDC activa descuento
    uint256 public discountedFeeBps = 100;                  // 1.00% desde 10.00 USDC en adelante
    uint256 public minFeeUsdc = 20_000;                     // 0.02 USDC piso mínimo
    uint256 public maxOrderCapUsdc = 500_000_000;           // 500 USDC tope de seguridad

    uint256 private _unlocked = 1;
    mapping(bytes32 => Job) public jobs;

    event JobFunded(
        bytes32 indexed jobId,
        address indexed buyer,
        address indexed provider,
        uint256 usdcAmount,
        uint256 feeAmount,
        uint64 expiresAt
    );
    event DeliverableSubmitted(bytes32 indexed jobId, address indexed provider, bytes32 deliverableHash);
    event JobSettled(
        bytes32 indexed jobId,
        address indexed provider,
        uint256 providerPayout,
        uint256 treasuryFee,
        bytes32 auditAttestation
    );
    event JobRefunded(bytes32 indexed jobId, address indexed buyer, uint256 refundedAmount, JobState finalState);
    event EvaluatorRotated(address indexed oldEvaluator, address indexed newEvaluator);

    error Unauthorized();
    error InvalidParameters();
    error InvalidState();
    error BelowMinTicket();
    error AboveMaxCap();
    error NotExpiredYet();
    error TransferFailed();
    error ReentrancyBlocked();

    modifier nonReentrant() {
        if (_unlocked != 1) revert ReentrancyBlocked();
        _unlocked = 2;
        _;
        _unlocked = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyEvaluator() {
        if (msg.sender != evaluator) revert Unauthorized();
        _;
    }

    constructor(address _usdc, address _evaluator, address _treasury) {
        if (_usdc == address(0) || _evaluator == address(0) || _treasury == address(0)) {
            revert InvalidParameters();
        }
        owner = msg.sender;
        usdc = IERC20Minimal(_usdc);
        evaluator = _evaluator;
        treasury = _treasury;
    }

    /**
     * @notice Paso 1: El Agente Comprador (o el Router Swap tras convertir SOL/ETH -> USDC) congela los USDC.
     */
    function openAndFundJob(
        bytes32 jobId,
        address buyer,
        address provider,
        uint256 usdcAmount,
        uint64 timeoutSeconds
    ) external nonReentrant {
        if (jobs[jobId].state != JobState.None) revert InvalidState();
        if (buyer == address(0) || provider == address(0) || timeoutSeconds < 60) revert InvalidParameters();
        if (usdcAmount < minOrderUsdc) revert BelowMinTicket();
        if (usdcAmount > maxOrderCapUsdc) revert AboveMaxCap();

        uint256 activeBps = usdcAmount >= volumeDiscountThresholdUsdc ? discountedFeeBps : standardFeeBps;
        uint256 calculatedFee = (usdcAmount * activeBps) / 10_000;
        if (calculatedFee < minFeeUsdc) {
            calculatedFee = minFeeUsdc;
        }

        jobs[jobId] = Job({
            buyer: buyer,
            provider: provider,
            usdcAmount: usdcAmount,
            feeAmount: calculatedFee,
            expiresAt: uint64(block.timestamp) + timeoutSeconds,
            deliverableHash: bytes32(0),
            auditAttestation: bytes32(0),
            state: JobState.Funded
        });

        bool ok = usdc.transferFrom(msg.sender, address(this), usdcAmount);
        if (!ok) revert TransferFailed();

        emit JobFunded(jobId, buyer, provider, usdcAmount, calculatedFee, uint64(block.timestamp) + timeoutSeconds);
    }

    /**
     * @notice Paso 2: La Tienda IA registra en blockchain la huella SHA-256 inmutable del dataset cifrado.
     */
    function submitDeliverableHash(bytes32 jobId, bytes32 deliverableHash) external {
        Job storage job = jobs[jobId];
        if (job.state != JobState.Funded) revert InvalidState();
        if (msg.sender != job.provider) revert Unauthorized();
        if (deliverableHash == bytes32(0)) revert InvalidParameters();

        job.deliverableHash = deliverableHash;
        job.state = JobState.Submitted;

        emit DeliverableSubmitted(jobId, msg.sender, deliverableHash);
    }

    /**
     * @notice Paso 3: Tu Wallet de IA (`evaluator`) emite el veredicto tras correr Antimalware + Muestreo Ciego.
     * @dev Nota de seguridad: `evaluator` NO puede enviarse el dinero ni cambiar destinatarios.
     */
    function submitVerdict(
        bytes32 jobId,
        bool approved,
        bytes32 auditAttestation
    ) external onlyEvaluator nonReentrant {
        Job storage job = jobs[jobId];
        if (job.state != JobState.Funded && job.state != JobState.Submitted) revert InvalidState();

        job.auditAttestation = auditAttestation;
        uint256 total = job.usdcAmount;

        if (approved) {
            uint256 fee = job.feeAmount;
            uint256 payout = total - fee;
            job.state = JobState.SettledApproved;

            if (!usdc.transfer(job.provider, payout)) revert TransferFailed();
            if (!usdc.transfer(treasury, fee)) revert TransferFailed();

            emit JobSettled(jobId, job.provider, payout, fee, auditAttestation);
        } else {
            job.state = JobState.RefundedRejected;

            if (!usdc.transfer(job.buyer, total)) revert TransferFailed();

            emit JobRefunded(jobId, job.buyer, total, JobState.RefundedRejected);
        }
    }

    /**
     * @notice Candado 4 (Deadman Switch): Si la Tienda IA o el Juez desaparecen y expira el plazo,
     *         cualquiera puede disparar el reembolso del 100% al comprador.
     */
    function claimTimeoutRefund(bytes32 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.state != JobState.Funded && job.state != JobState.Submitted) revert InvalidState();
        if (block.timestamp <= job.expiresAt) revert NotExpiredYet();

        uint256 total = job.usdcAmount;
        job.state = JobState.RefundedExpired;

        if (!usdc.transfer(job.buyer, total)) revert TransferFailed();

        emit JobRefunded(jobId, job.buyer, total, JobState.RefundedExpired);
    }

    /**
     * @notice Si algún día quieres rotar la Session Key / Wallet de tu IA sin cambiar de contrato.
     */
    function rotateEvaluatorKey(address newEvaluator) external onlyOwner {
        if (newEvaluator == address(0)) revert InvalidParameters();
        address old = evaluator;
        evaluator = newEvaluator;
        emit EvaluatorRotated(old, newEvaluator);
    }
}
