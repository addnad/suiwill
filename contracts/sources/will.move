module suiwill::will {
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::vec_map::{Self, VecMap};
    use sui::event;
    use sui::balance::{Self, Balance};

    // ===== Constants =====
    const GRACE_PERIOD_MS: u64 = 604800000; // 7 days in ms

    // ===== Errors =====
    const ENotOwner: u64 = 0;
    const EAlreadyInGrace: u64 = 1;
    const ENotInGrace: u64 = 2;
    const EGraceNotExpired: u64 = 3;
    const EInvalidShares: u64 = 4;
    const EStillActive: u64 = 5;
    const ENoAssets: u64 = 6;
    const EInGrace: u64 = 7;

    // ===== Events =====
    public struct WillCreated has copy, drop {
        will_id: ID,
        owner: address,
        timeout_ms: u64,
    }

    public struct HeartbeatRecorded has copy, drop {
        will_id: ID,
        owner: address,
        timestamp_ms: u64,
    }

    public struct GraceTriggered has copy, drop {
        will_id: ID,
        owner: address,
        grace_start_ms: u64,
    }

    public struct GraceCancelled has copy, drop {
        will_id: ID,
        owner: address,
    }

    public struct WillExecuted has copy, drop {
        will_id: ID,
        owner: address,
        timestamp_ms: u64,
        amount: u64,
    }

    public struct FundsDeposited has copy, drop {
        will_id: ID,
        owner: address,
        amount: u64,
        total_balance: u64,
    }

    public struct FundsWithdrawn has copy, drop {
        will_id: ID,
        owner: address,
        amount: u64,
    }

    // ===== Core Object =====
    public struct SuiWill has key {
        id: UID,
        owner: address,
        beneficiaries: VecMap<address, u64>,
        last_seen_ms: u64,
        timeout_ms: u64,
        walrus_blob_id: vector<u8>,
        in_grace: bool,
        grace_start_ms: u64,
        vault: Balance<SUI>,
    }

    // ===== Public Functions =====

    /// Create a new SuiWill shared object
    public fun create_will(
        beneficiaries: vector<address>,
        shares: vector<u64>,
        timeout_ms: u64,
        walrus_blob_id: vector<u8>,
        initial_deposit: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&beneficiaries) == vector::length(&shares), EInvalidShares);
        assert!(vector::length(&beneficiaries) > 0, EInvalidShares);

        let mut total: u64 = 0;
        let mut i = 0;
        while (i < vector::length(&shares)) {
            total = total + *vector::borrow(&shares, i);
            i = i + 1;
        };
        assert!(total == 10000, EInvalidShares);

        let mut beneficiary_map = vec_map::empty<address, u64>();
        let mut j = 0;
        while (j < vector::length(&beneficiaries)) {
            vec_map::insert(
                &mut beneficiary_map,
                *vector::borrow(&beneficiaries, j),
                *vector::borrow(&shares, j),
            );
            j = j + 1;
        };

        let now = clock.timestamp_ms();
        let deposit_amount = coin::value(&initial_deposit);

        let will = SuiWill {
            id: object::new(ctx),
            owner: ctx.sender(),
            beneficiaries: beneficiary_map,
            last_seen_ms: now,
            timeout_ms,
            walrus_blob_id,
            in_grace: false,
            grace_start_ms: 0,
            vault: coin::into_balance(initial_deposit),
        };

        event::emit(WillCreated {
            will_id: object::id(&will),
            owner: ctx.sender(),
            timeout_ms,
        });

        if (deposit_amount > 0) {
            event::emit(FundsDeposited {
                will_id: object::id(&will),
                owner: ctx.sender(),
                amount: deposit_amount,
                total_balance: deposit_amount,
            });
        };

        transfer::share_object(will);
    }

    /// Deposit SUI into the vault
    public fun deposit(
        will: &mut SuiWill,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(will.owner == ctx.sender(), ENotOwner);
        let amount = coin::value(&payment);
        let total = balance::value(&will.vault) + amount;
        balance::join(&mut will.vault, coin::into_balance(payment));

        event::emit(FundsDeposited {
            will_id: object::id(will),
            owner: ctx.sender(),
            amount,
            total_balance: total,
        });
    }

    /// Withdraw SUI from vault (owner only, not in grace)
    public fun withdraw(
        will: &mut SuiWill,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        assert!(will.owner == ctx.sender(), ENotOwner);
        assert!(!will.in_grace, EInGrace);
        let coin = coin::from_balance(balance::split(&mut will.vault, amount), ctx);

        event::emit(FundsWithdrawn {
            will_id: object::id(will),
            owner: ctx.sender(),
            amount,
        });

        transfer::public_transfer(coin, ctx.sender());
    }

    /// Record a heartbeat
    public fun heartbeat(
        will: &mut SuiWill,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(will.owner == ctx.sender(), ENotOwner);
        assert!(!will.in_grace, EAlreadyInGrace);
        let now = clock.timestamp_ms();
        will.last_seen_ms = now;

        event::emit(HeartbeatRecorded {
            will_id: object::id(will),
            owner: ctx.sender(),
            timestamp_ms: now,
        });
    }

    /// Trigger grace period
    public fun trigger_grace(
        will: &mut SuiWill,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(!will.in_grace, EAlreadyInGrace);
        let now = clock.timestamp_ms();
        assert!(now >= will.last_seen_ms + will.timeout_ms, EStillActive);
        will.in_grace = true;
        will.grace_start_ms = now;

        event::emit(GraceTriggered {
            will_id: object::id(will),
            owner: will.owner,
            grace_start_ms: now,
        });
    }

    /// Cancel grace period
    public fun cancel_grace(
        will: &mut SuiWill,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(will.owner == ctx.sender(), ENotOwner);
        assert!(will.in_grace, ENotInGrace);
        let now = clock.timestamp_ms();
        will.in_grace = false;
        will.grace_start_ms = 0;
        will.last_seen_ms = now;

        event::emit(GraceCancelled {
            will_id: object::id(will),
            owner: ctx.sender(),
        });
    }

    /// Execute will — distributes vault balance to beneficiaries
    public fun execute_will(
        will: &mut SuiWill,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(will.in_grace, ENotInGrace);
        let now = clock.timestamp_ms();
        assert!(now >= will.grace_start_ms + GRACE_PERIOD_MS, EGraceNotExpired);

        let total_amount = balance::value(&will.vault);
        assert!(total_amount > 0, ENoAssets);

        let n = vec_map::length(&will.beneficiaries);
        let mut i = 0;
        let mut distributed: u64 = 0;

        while (i < n - 1) {
            let (addr, share) = vec_map::get_entry_by_idx(&will.beneficiaries, i);
            let amount = (total_amount * *share) / 10000;
            if (amount > 0) {
                let payout = coin::from_balance(balance::split(&mut will.vault, amount), ctx);
                transfer::public_transfer(payout, *addr);
                distributed = distributed + amount;
            };
            i = i + 1;
        };

        // Send remaining balance to last beneficiary (handles rounding dust)
        let remaining = balance::value(&will.vault);
        if (remaining > 0) {
            let (last_addr, _) = vec_map::get_entry_by_idx(&will.beneficiaries, n - 1);
            let payout = coin::from_balance(balance::split(&mut will.vault, remaining), ctx);
            transfer::public_transfer(payout, *last_addr);
        };

        event::emit(WillExecuted {
            will_id: object::id(will),
            owner: will.owner,
            timestamp_ms: now,
            amount: total_amount,
        });
    }

    /// Update walrus blob ID
    public fun update_message(
        will: &mut SuiWill,
        new_blob_id: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(will.owner == ctx.sender(), ENotOwner);
        will.walrus_blob_id = new_blob_id;
    }

    /// Close will — withdraw all funds and deactivate (owner only, not in grace)
    public fun close_will(
        will: SuiWill,
        ctx: &mut TxContext,
    ) {
        assert!(will.owner == ctx.sender(), ENotOwner);
        assert!(!will.in_grace, EInGrace);

        let SuiWill {
            id,
            owner: _,
            beneficiaries: _,
            last_seen_ms: _,
            timeout_ms: _,
            walrus_blob_id: _,
            in_grace: _,
            grace_start_ms: _,
            vault,
        } = will;

        // Return remaining vault balance to owner
        if (balance::value(&vault) > 0) {
            let coin = coin::from_balance(vault, ctx);
            transfer::public_transfer(coin, ctx.sender());
        } else {
            balance::destroy_zero(vault);
        };

        object::delete(id);
    }

    // ===== View Functions =====
    public fun owner(will: &SuiWill): address { will.owner }
    public fun last_seen_ms(will: &SuiWill): u64 { will.last_seen_ms }
    public fun timeout_ms(will: &SuiWill): u64 { will.timeout_ms }
    public fun in_grace(will: &SuiWill): bool { will.in_grace }
    public fun grace_start_ms(will: &SuiWill): u64 { will.grace_start_ms }
    public fun walrus_blob_id(will: &SuiWill): vector<u8> { will.walrus_blob_id }
    public fun vault_balance(will: &SuiWill): u64 { balance::value(&will.vault) }
}
