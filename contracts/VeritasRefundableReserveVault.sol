// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

/**
 * @title VeritasRefundableReserveVault
 * @notice Non-custodial Proof-of-Reserve & Refundable Guarantee Vault for VERITAS-8183 2-Star and 3-Star AI Sellers.
 * @dev Key Guarantees:
 *      1. Seller Ownership & Free Idle Withdrawal: A seller can withdraw 100% of their available (unlocked) USDC
 *         reserve at any time via `withdrawReserve` without permission from the owner or evaluator.
 *      2. Buyer Protection During Active Claims: While a post-delivery SLA or refund claim is open, only the
 *         disputed amount (`lockedForClaimsUsdc`) is temporarily locked until the evaluator resolves it or the
 *         claim timeout expires.
 *      3. Deadman Switch (`unlockExpiredClaim`): If an open claim is not resolved before `expiresAt`, anyone can
 *         unlock the reserved USDC back to the seller's withdrawable balance so funds are never trapped.
 */

interface IERC20ReserveMinimal {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract VeritasRefundableReserveVault {
    enum ClaimState {
        None,
        Locked,
        ResolvedRefundedToBuyer,
        ResolvedReleasedToSeller,
        ExpiredUnlockedToSeller
    }

    struct SellerReserve {
        uint256 totalDepositedUsdc;
        uint256 lockedForClaimsUsdc;
        uint32 activeClaimsCount;
        uint64 lastUpdatedAt;
    }

    struct ReserveClaim {
        address seller;
        address buyer;
        uint256 amountUsdc;
        uint64 expiresAt;
        bytes32 auditAttestation;
        ClaimState state;
    }

    IERC20ReserveMinimal public immutable usdc;
    address public owner;
    address public evaluator;

    uint256 public constant TIER2_MIN_RESERVE_USDC = 10_000_000;        // 10.00 USDC (6 decimals)
    uint256 public constant TIER3_INDIE_MIN_RESERVE_USDC = 25_000_000;  // 25.00 USDC (6 decimals)
    uint256 public constant TIER3_INST_MIN_RESERVE_USDC = 200_000_000;  // 200.00 USDC (6 decimals)

    uint256 private _unlocked = 1;
    mapping(address => SellerReserve) public sellerReserves;
    mapping(bytes32 => ReserveClaim) public claims;

    event ReserveDeposited(address indexed seller, uint256 amountUsdc, uint256 newTotalDepositedUsdc);
    event ReserveWithdrawn(address indexed seller, uint256 amountUsdc, uint256 remainingDepositedUsdc);
    event ClaimLocked(
        bytes32 indexed claimId,
        address indexed seller,
        address indexed buyer,
        uint256 amountUsdc,
        uint64 expiresAt
    );
    event ClaimResolved(
        bytes32 indexed claimId,
        address indexed seller,
        address indexed buyer,
        uint256 amountUsdc,
        bool refundedToBuyer,
        bytes32 auditAttestation
    );
    event ClaimExpiredUnlocked(bytes32 indexed claimId, address indexed seller, uint256 amountUsdc);
    event EvaluatorRotated(address indexed oldEvaluator, address indexed newEvaluator);

    error Unauthorized();
    error InvalidParameters();
    error InsufficientWithdrawableReserve();
    error InvalidClaimState();
    error ClaimNotExpiredYet();
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

    constructor(address _usdc, address _evaluator) {
        if (_usdc == address(0) || _evaluator == address(0)) revert InvalidParameters();
        owner = msg.sender;
        usdc = IERC20ReserveMinimal(_usdc);
        evaluator = _evaluator;
    }

    /**
     * @notice Seller deposits USDC into the reserve vault to qualify for 2-Star or 3-Star Gold status.
     */
    function depositReserve(uint256 amountUsdc) external nonReentrant {
        if (amountUsdc == 0) revert InvalidParameters();

        SellerReserve storage reserve = sellerReserves[msg.sender];
        reserve.totalDepositedUsdc += amountUsdc;
        reserve.lastUpdatedAt = uint64(block.timestamp);

        if (!usdc.transferFrom(msg.sender, address(this), amountUsdc)) revert TransferFailed();

        emit ReserveDeposited(msg.sender, amountUsdc, reserve.totalDepositedUsdc);
    }

    /**
     * @notice Seller withdraws any or all unlocked USDC reserve at any time without permission.
     *         If the seller has 0 active claims, 100% of totalDepositedUsdc is immediately withdrawable.
     */
    function withdrawReserve(uint256 amountUsdc) external nonReentrant {
        if (amountUsdc == 0) revert InvalidParameters();

        SellerReserve storage reserve = sellerReserves[msg.sender];
        uint256 withdrawable = reserve.totalDepositedUsdc - reserve.lockedForClaimsUsdc;
        if (amountUsdc > withdrawable) revert InsufficientWithdrawableReserve();

        reserve.totalDepositedUsdc -= amountUsdc;
        reserve.lastUpdatedAt = uint64(block.timestamp);

        if (!usdc.transfer(msg.sender, amountUsdc)) revert TransferFailed();

        emit ReserveWithdrawn(msg.sender, amountUsdc, reserve.totalDepositedUsdc);
    }

    /**
     * @notice Evaluator locks a specific portion of a seller's idle reserve during an active post-delivery SLA claim.
     */
    function lockReserveForClaim(
        bytes32 claimId,
        address seller,
        address buyer,
        uint256 amountUsdc,
        uint64 timeoutSeconds
    ) external onlyEvaluator nonReentrant {
        if (claims[claimId].state != ClaimState.None) revert InvalidClaimState();
        if (seller == address(0) || buyer == address(0) || amountUsdc == 0 || timeoutSeconds < 60) {
            revert InvalidParameters();
        }

        SellerReserve storage reserve = sellerReserves[seller];
        uint256 withdrawable = reserve.totalDepositedUsdc - reserve.lockedForClaimsUsdc;
        if (amountUsdc > withdrawable) revert InsufficientWithdrawableReserve();

        uint64 expiresAt = uint64(block.timestamp) + timeoutSeconds;
        reserve.lockedForClaimsUsdc += amountUsdc;
        reserve.activeClaimsCount += 1;
        reserve.lastUpdatedAt = uint64(block.timestamp);

        claims[claimId] = ReserveClaim({
            seller: seller,
            buyer: buyer,
            amountUsdc: amountUsdc,
            expiresAt: expiresAt,
            auditAttestation: bytes32(0),
            state: ClaimState.Locked
        });

        emit ClaimLocked(claimId, seller, buyer, amountUsdc, expiresAt);
    }

    /**
     * @notice Evaluator resolves a locked claim either by refunding the buyer or releasing the lock back to the seller.
     */
    function resolveReserveClaim(
        bytes32 claimId,
        bool refundToBuyer,
        bytes32 auditAttestation
    ) external onlyEvaluator nonReentrant {
        ReserveClaim storage claim = claims[claimId];
        if (claim.state != ClaimState.Locked) revert InvalidClaimState();

        SellerReserve storage reserve = sellerReserves[claim.seller];
        uint256 amount = claim.amountUsdc;
        reserve.lockedForClaimsUsdc -= amount;
        reserve.activeClaimsCount -= 1;
        reserve.lastUpdatedAt = uint64(block.timestamp);
        claim.auditAttestation = auditAttestation;

        if (refundToBuyer) {
            reserve.totalDepositedUsdc -= amount;
            claim.state = ClaimState.ResolvedRefundedToBuyer;
            if (!usdc.transfer(claim.buyer, amount)) revert TransferFailed();
        } else {
            claim.state = ClaimState.ResolvedReleasedToSeller;
        }

        emit ClaimResolved(claimId, claim.seller, claim.buyer, amount, refundToBuyer, auditAttestation);
    }

    /**
     * @notice Deadman Switch: if an open claim expires without a verdict, anyone can unlock the funds back to the seller.
     */
    function unlockExpiredClaim(bytes32 claimId) external nonReentrant {
        ReserveClaim storage claim = claims[claimId];
        if (claim.state != ClaimState.Locked) revert InvalidClaimState();
        if (block.timestamp <= claim.expiresAt) revert ClaimNotExpiredYet();

        SellerReserve storage reserve = sellerReserves[claim.seller];
        uint256 amount = claim.amountUsdc;
        reserve.lockedForClaimsUsdc -= amount;
        reserve.activeClaimsCount -= 1;
        reserve.lastUpdatedAt = uint64(block.timestamp);
        claim.state = ClaimState.ExpiredUnlockedToSeller;

        emit ClaimExpiredUnlocked(claimId, claim.seller, amount);
    }

    /**
     * @notice Returns the real-time reserve breakdown and star-tier liquidity eligibility for a seller.
     */
    function getSellerReserveStatus(address seller)
        external
        view
        returns (
            uint256 totalDepositedUsdc,
            uint256 lockedForClaimsUsdc,
            uint256 withdrawableIdleUsdc,
            uint32 activeClaimsCount,
            bool meetsTier2Liquidity,
            bool meetsTier3IndieLiquidity,
            bool meetsTier3InstitutionalLiquidity
        )
    {
        SellerReserve memory reserve = sellerReserves[seller];
        totalDepositedUsdc = reserve.totalDepositedUsdc;
        lockedForClaimsUsdc = reserve.lockedForClaimsUsdc;
        withdrawableIdleUsdc = reserve.totalDepositedUsdc - reserve.lockedForClaimsUsdc;
        activeClaimsCount = reserve.activeClaimsCount;
        meetsTier2Liquidity = withdrawableIdleUsdc >= TIER2_MIN_RESERVE_USDC;
        meetsTier3IndieLiquidity = withdrawableIdleUsdc >= TIER3_INDIE_MIN_RESERVE_USDC;
        meetsTier3InstitutionalLiquidity = withdrawableIdleUsdc >= TIER3_INST_MIN_RESERVE_USDC;
    }

    /**
     * @notice Rotates the evaluator address if the AI auditor key is upgraded.
     */
    function rotateEvaluatorKey(address newEvaluator) external onlyOwner {
        if (newEvaluator == address(0)) revert InvalidParameters();
        address old = evaluator;
        evaluator = newEvaluator;
        emit EvaluatorRotated(old, newEvaluator);
    }
}
