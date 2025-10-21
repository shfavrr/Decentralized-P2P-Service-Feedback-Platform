(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-EPOCH u101)
(define-constant ERR-NO-ALLOCATIONS u102)
(define-constant ERR-INSUFFICIENT-BALANCE u103)
(define-constant ERR-DISTRIBUTION-PAUSED u104)
(define-constant ERR-INVALID-PROVIDER u105)
(define-constant ERR-ALREADY-CLAIMED u106)
(define-constant ERR-NO-PENDING u107)
(define-constant ERR-INVALID-AMOUNT u108)
(define-constant ERR-EPOCH-NOT-READY u109)
(define-constant ERR-MAX-PROVIDERS_EXCEEDED u110)
(define-constant ERR-INVALID-MIN-PAYOUT u111)
(define-constant ERR-INVALID-DISTRIBUTION-FREQUENCY u112)
(define-constant ERR-INVALID-DUST_THRESHOLD u113)
(define-constant ERR-CONTRACT-NOT-SET u114)
(define-constant ERR-INVALID-STATUS u115)
(define-constant ERR-OVERFLOW u116)
(define-constant ERR-UNDERFLOW u117)
(define-constant ERR-DIVISION-BY-ZERO u118)
(define-constant ERR-INVALID-PARAM u119)
(define-constant ERR-PAUSE-NOT-ALLOWED u120)

(define-data-var next-epoch uint u1)
(define-data-var distribution-paused bool false)
(define-data-var min-payout uint u100)
(define-data-var dust-threshold uint u10)
(define-data-var max-providers uint u500)
(define-data-var distribution-frequency uint u144)
(define-data-var admin principal tx-sender)
(define-data-var funding-pool-contract principal 'SP000000000000000000002Q6VF78.bogus-pool)
(define-data-var allocation-calculator-contract principal 'SP000000000000000000002Q6VF78.bogus-calc)
(define-data-var last-distribution-block uint u0)

(define-map allocations-by-epoch
  uint
  (list 500 {provider: principal, amount: uint})
)

(define-map pending-claims
  principal
  uint
)

(define-map epoch-status
  uint
  bool
)

(define-map total-distributed-by-epoch
  uint
  uint
)

(define-read-only (get-next-epoch)
  (var-get next-epoch)
)

(define-read-only (get-distribution-paused)
  (var-get distribution-paused)
)

(define-read-only (get-min-payout)
  (var-get min-payout)
)

(define-read-only (get-dust-threshold)
  (var-get dust-threshold)
)

(define-read-only (get-max-providers)
  (var-get max-providers)
)

(define-read-only (get-distribution-frequency)
  (var-get distribution-frequency)
)

(define-read-only (get-admin)
  (var-get admin)
)

(define-read-only (get-funding-pool-contract)
  (var-get funding-pool-contract)
)

(define-read-only (get-allocation-calculator-contract)
  (var-get allocation-calculator-contract)
)

(define-read-only (get-last-distribution-block)
  (var-get last-distribution-block)
)

(define-read-only (get-allocations-by-epoch (epoch uint))
  (map-get? allocations-by-epoch epoch)
)

(define-read-only (get-pending-claim (provider principal))
  (default-to u0 (map-get? pending-claims provider))
)

(define-read-only (get-epoch-status (epoch uint))
  (default-to false (map-get? epoch-status epoch))
)

(define-read-only (get-total-distributed-by-epoch (epoch uint))
  (default-to u0 (map-get? total-distributed-by-epoch epoch))
)

(define-read-only (get-current-epoch)
  (/ (- block-height u1) (var-get distribution-frequency))
)

(define-private (validate-epoch (epoch uint))
  (if (> epoch u0)
    (ok true)
    (err ERR-INVALID-EPOCH))
)

(define-private (validate-amount (amount uint))
  (if (> amount u0)
    (ok true)
    (err ERR-INVALID-AMOUNT))
)

(define-private (validate-provider (provider principal))
  (if (not (is-eq provider tx-sender))
    (ok true)
    (err ERR-INVALID-PROVIDER))
)

(define-private (validate-admin)
  (if (is-eq tx-sender (var-get admin))
    (ok true)
    (err ERR-NOT-AUTHORIZED))
)

(define-private (validate-not-paused)
  (if (not (var-get distribution-paused))
    (ok true)
    (err ERR-DISTRIBUTION-PAUSED))
)

(define-private (validate-epoch-ready (epoch uint))
  (let ((current-epoch (get-current-epoch)))
    (if (>= current-epoch (+ epoch u1))
      (ok true)
      (err ERR-EPOCH-NOT-READY)))
)

(define-private (sum-allocations (allocs (list 500 {provider: principal, amount: uint})))
  (fold + (map get amount allocs) u0)
)

(define-private (safe-add (a uint) (b uint))
  (let ((result (+ a b)))
    (if (>= result a)
      result
      (unwrap-panic (err ERR-OVERFLOW))))
)

(define-private (safe-sub (a uint) (b uint))
  (if (>= a b)
    (- a b)
    (unwrap-panic (err ERR-UNDERFLOW)))
)

(define-private (safe-div (a uint) (b uint))
  (if (> b u0)
    (/ a b)
    (unwrap-panic (err ERR-DIVISION-BY-ZERO)))
)

(define-public (set-funding-pool-contract (new-contract principal))
  (begin
    (try! (validate-admin))
    (var-set funding-pool-contract new-contract)
    (ok true))
)

(define-public (set-allocation-calculator-contract (new-contract principal))
  (begin
    (try! (validate-admin))
    (var-set allocation-calculator-contract new-contract)
    (ok true))
)

(define-public (set-min-payout (new-min uint))
  (begin
    (try! (validate-admin))
    (try! (validate-amount new-min))
    (var-set min-payout new-min)
    (ok true))
)

(define-public (set-dust-threshold (new-threshold uint))
  (begin
    (try! (validate-admin))
    (try! (validate-amount new-threshold))
    (var-set dust-threshold new-threshold)
    (ok true))
)

(define-public (set-max-providers (new-max uint))
  (begin
    (try! (validate-admin))
    (if (> new-max u0)
      (ok (var-set max-providers new-max))
      (err ERR-INVALID-PARAM)))
)

(define-public (set-distribution-frequency (new-freq uint))
  (begin
    (try! (validate-admin))
    (if (> new-freq u0)
      (ok (var-set distribution-frequency new-freq))
      (err ERR-INVALID-DISTRIBUTION-FREQUENCY)))
)

(define-public (pause-distribution (pause bool))
  (begin
    (try! (validate-admin))
    (var-set distribution-paused pause)
    (ok true))
)

(define-public (distribute-funds)
  (let (
    (current-epoch (get-current-epoch))
    (prev-epoch (- current-epoch u1))
    (allocs (unwrap! (contract-call? (var-get allocation-calculator-contract) compute-allocations prev-epoch) (err ERR-NO-ALLOCATIONS)))
    (pool-balance (unwrap! (contract-call? (var-get funding-pool-contract) get-available-balance) (err ERR-INSUFFICIENT-BALANCE)))
    (total-alloc-sum (sum-allocations allocs))
  )
    (try! (validate-not-paused))
    (try! (validate-epoch-ready prev-epoch))
    (asserts! (>= pool-balance total-alloc-sum) (err ERR-INSUFFICIENT-BALANCE))
    (asserts! (<= (len allocs) (var-get max-providers)) (err ERR-MAX-PROVIDERS_EXCEEDED))
    (asserts! (not (get-epoch-status prev-epoch)) (err ERR-ALREADY-CLAIMED))
    (map distribute-to-provider allocs)
    (map-set epoch-status prev-epoch true)
    (map-set total-distributed-by-epoch prev-epoch total-alloc-sum)
    (var-set last-distribution-block block-height)
    (print {event: "funds-distributed", epoch: prev-epoch, total: total-alloc-sum})
    (ok true))
)

(define-private (distribute-to-provider (alloc {provider: principal, amount: uint}))
  (let (
    (prov (get provider alloc))
    (amt (get amount alloc))
    (min-p (var-get min-payout))
    (dust (var-get dust-threshold))
  )
    (if (>= amt min-p)
      (begin
        (if (<= amt dust)
          (map-set pending-claims prov (safe-add (get-pending-claim prov) amt))
          (unwrap! (contract-call? (var-get funding-pool-contract) transfer-funds prov amt) (err ERR-INVALID-AMOUNT)))
        (ok true))
      (err ERR-INVALID-AMOUNT))))

(define-public (claim-allocation)
  (let (
    (provider tx-sender)
    (pending (get-pending-claim provider))
  )
    (try! (validate-amount pending))
    (unwrap! (contract-call? (var-get funding-pool-contract) transfer-funds provider pending) (err ERR-INVALID-AMOUNT))
    (map-delete pending-claims provider)
    (print {event: "allocation-claimed", provider: provider, amount: pending})
    (ok pending))
)

(define-public (get-pending-allocations-count)
  (ok (fold + (map get-pending-claim (list tx-sender tx-sender)) u0))
)

(define-public (emergency-withdraw (amount uint) (recipient principal))
  (begin
    (try! (validate-admin))
    (unwrap! (contract-call? (var-get funding-pool-contract) transfer-funds recipient amount) (err ERR-INVALID-AMOUNT))
    (ok true))
)

(define-public (update-admin (new-admin principal))
  (begin
    (try! (validate-admin))
    (var-set admin new-admin)
    (ok true))
)