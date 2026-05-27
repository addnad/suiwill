module suiwill::will {
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::vec_map::{Self, VecMap};
    use sui::event;

    // ===== Constants =====
    // 7 days in milliseconds
    const GRACE_PERIOD_MS: u64 = 604800000;

    // ===== Errors =====
    const ENotOwner: u64 = 0;
    const EAlreadyInGrace: u64 = 1;
    const ENotInGrace: u64 = 2;
    const EGraceNotExpired: u64 = 3;
    const EInvalidShares: u64 = 4;
    const EStillActive: u64 = 5;
    const ENoAssets: u64 = 6;

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
    }

    // ===== Public Functions =====

    /// Create a new SuiWill shared object
    public fun create_will(
        beneficiaries: vector<address>,
        shares: vector<u64>,
        timeout_ms: u64,
        walrus_blob_id: vector<u8>,
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

        let will = SuiWill {
            id: object::new(ctx),
            owner: ctx.sender(),
            beneficiaries: beneficiary_map,
            last_seen_ms: now,
            timeout_ms,
            walrus_blob_id,
            in_grace: false,
            grace_start_ms: 0,
        };

        event::emit(WillCreated {
            will_id: object::id(&will),
            owner: ctx.sender(),
            timeout_ms,
        });

        transfer::share_object(will);
    }

    /// Record a heartbeat — resets the inactivity clock
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

    /// Trigger grace period — called by watcher agent when inactivity detected
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

    /// Cancel grace period — owner signs to prove they are alive
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

    /// Execute will — distributes assets to beneficiaries after grace period
    public fun execute_will(
        will: &mut SuiWill,
        mut payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(will.in_grace, ENotInGrace);
        let now = clock.timestamp_ms();
        assert!(now >= will.grace_start_ms + GRACE_PERIOD_MS, EGraceNotExpired);

        let total_amount = coin::value(&payment);
        assert!(total_amount > 0, ENoAssets);

        let mut i = 0;
        let n = vec_map::length(&will.beneficiaries);

        while (i < n) {
            let (addr, share) = vec_map::get_entry_by_idx(&will.beneficiaries, i);
            let amount = (total_amount * *share) / 10000;
            if (amount > 0) {
                let payout = coin::split(&mut payment, amount, ctx);
                transfer::public_transfer(payout, *addr);
            };
            i = i + 1;
        };

        if (coin::value(&payment) > 0) {
            let (last_addr, _) = vec_map::get_entry_by_idx(&will.beneficiaries, n - 1);
            transfer::public_transfer(payment, *last_addr);
        } else {
            coin::destroy_zero(payment);
        };

        event::emit(WillExecuted {
            will_id: object::id(will),
            owner: will.owner,
            timestamp_ms: now,
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

    // ===== View Functions =====
    public fun owner(will: &SuiWill): address { will.owner }
    public fun last_seen_ms(will: &SuiWill): u64 { will.last_seen_ms }
    public fun timeout_ms(will: &SuiWill): u64 { will.timeout_ms }
    public fun in_grace(will: &SuiWill): bool { will.in_grace }
    public fun grace_start_ms(will: &SuiWill): u64 { will.grace_start_ms }
    public fun walrus_blob_id(will: &SuiWill): vector<u8> { will.walrus_blob_id }
}
