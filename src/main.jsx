import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API =
  "https://subscribe-n-save-backend.vercel.app/api";

const products = [
  {
    id: "coffee",
    name: "Premium Coffee",
    description:
      "Freshly roasted premium coffee delivered to your doorstep.",
    oneTime: 1099,
    monthly: 999,
    saving: "Save ₹100/month",
  },
  {
    id: "essentials",
    name: "Daily Essentials",
    description:
      "Everyday essentials delivered automatically when you need them.",
    oneTime: 549,
    monthly: 499,
    saving: "Save ₹50/month",
  },
];

/* =========================================================
   CUSTOMER CHECKOUT

   Kept outside App so input focus is preserved.
========================================================= */

function Checkout({
  selectedProduct,
  frequency,
  customerName,
  setCustomerName,
  cardNumber,
  setCardNumber,
  consent,
  setConsent,
  error,
  loading,
  startBack,
  enrollSubscription,
}) {
  if (!selectedProduct) return null;

  return (
    <section className="customer-page">
      <button
        className="back-button"
        onClick={startBack}
      >
        ← Back
      </button>

      <div className="checkout-layout">
        <div className="checkout-card">
          <div className="eyebrow">
            CHECKOUT
          </div>

          <h1>Start your subscription</h1>

          <p>
            Your first payment is made now.
            Future payments will be processed
            automatically according to your
            subscription schedule.
          </p>

          <label>
            Your name

            <input
              type="text"
              value={customerName}
              onChange={(e) =>
                setCustomerName(
                  e.target.value
                )
              }
              placeholder="e.g. Ashwin Awachar"
              autoComplete="name"
            />
          </label>

          <label>
            Card number

            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) =>
                setCardNumber(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              maxLength={19}
              placeholder="4242424242424242"
              autoComplete="off"
            />
          </label>

          <div className="demo-note">
            Demo only — do not enter a real
            card number.
          </div>

          <label className="consent-box">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) =>
                setConsent(
                  e.target.checked
                )
              }
            />

            <span>
              I agree to recurring payments for
              this subscription and authorize
              future payments according to the
              selected plan and frequency.
            </span>
          </label>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            className="primary full-width"
            disabled={loading}
            onClick={enrollSubscription}
          >
            {loading
              ? "Processing..."
              : `Pay ₹${selectedProduct.monthly} & Start Subscription`}
          </button>
        </div>

        <div className="order-summary">
          <h3>Order Summary</h3>

          <div className="summary-product">
            <span>
              {selectedProduct.name}
            </span>

            <strong>
              ₹{selectedProduct.monthly}
            </strong>
          </div>

          <div className="summary-line">
            <span>Frequency</span>

            <span>
              {frequency === "MONTHLY"
                ? "Monthly"
                : "Weekly"}
            </span>
          </div>

          <div className="summary-line">
            <span>Initial payment</span>

            <span>
              ₹{selectedProduct.monthly}
            </span>
          </div>

          <hr />

          <div className="summary-total">
            <span>Pay now</span>

            <strong>
              ₹{selectedProduct.monthly}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  /* =======================================================
     CUSTOMER STORE STATE
  ======================================================= */

  const [mode, setMode] =
    useState("store");

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [frequency, setFrequency] =
    useState("MONTHLY");

  const [customerName, setCustomerName] =
    useState("");

  const [cardNumber, setCardNumber] =
    useState("");

  const [consent, setConsent] =
    useState(false);

  const [enrollment, setEnrollment] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     OPERATIONS STATE
  ======================================================= */

  const [subscriptions, setSubscriptions] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  const [selectedSubscription, setSelectedSubscription] =
    useState(null);

  const [events, setEvents] =
    useState([]);

  const [paymentResponse, setPaymentResponse] =
    useState(null);

  /*
    Selected payment scenario.

    Possible values:

    SUCCESS
    DECLINED
    UNKNOWN
    3DS_REQUIRED
    DUPLICATE
  */
  const [selectedOutcome, setSelectedOutcome] =
    useState(null);

  /*
    Stores the idempotency key from the
    most recent SUCCESS payment.

    DUPLICATE REQUEST reuses this key.
  */
  const [lastIdempotencyKey, setLastIdempotencyKey] =
    useState(null);

  /* =======================================================
     LOAD OPERATIONS DATA
  ======================================================= */

  async function loadOperationsData() {
    try {
      const [
        subscriptionsResponse,
        paymentsResponse,
      ] = await Promise.all([
        fetch(
          `${API}/subscriptions`
        ),
        fetch(
          `${API}/payments`
        ),
      ]);

      const subscriptionsData =
        await subscriptionsResponse.json();

      const paymentsData =
        await paymentsResponse.json();

      setSubscriptions(
        subscriptionsData
      );

      setPayments(
        paymentsData
      );

      if (
        !selectedSubscription &&
        subscriptionsData.length > 0
      ) {
        setSelectedSubscription(
          subscriptionsData[0].id
        );
      }
    } catch (err) {
      console.error(
        "Unable to load operations data:",
        err
      );
    }
  }

  useEffect(() => {
    loadOperationsData();
  }, []);

  /* =======================================================
     LOAD EVENTS
  ======================================================= */

  async function loadEvents(
    subscriptionId
  ) {
    if (!subscriptionId) return;

    try {
      const response =
        await fetch(
          `${API}/subscriptions/${subscriptionId}/events`
        );

      const data =
        await response.json();

      setEvents(data);
    } catch (err) {
      console.error(
        "Unable to load events:",
        err
      );
    }
  }

  useEffect(() => {
    if (selectedSubscription) {
      loadEvents(
        selectedSubscription
      );
    }
  }, [selectedSubscription]);

  /* =======================================================
     CUSTOMER FLOW
  ======================================================= */

  function openProduct(product) {
    setSelectedProduct(product);
    setFrequency("MONTHLY");
    setError("");
    setMode("product");
  }

  function startCheckout() {
    setError("");
    setMode("checkout");
  }

  function backFromCheckout() {
    setError("");
    setMode("product");
  }

  /* =======================================================
     ENROLL SUBSCRIPTION

     Initial payment = CIT
     Future payments = MIT
  ======================================================= */

  async function enrollSubscription() {
    setError("");

    if (!customerName.trim()) {
      setError(
        "Please enter your name."
      );
      return;
    }

    const cleanCardNumber =
      cardNumber.replace(
        /\D/g,
        ""
      );

    if (
      cleanCardNumber.length < 12
    ) {
      setError(
        "Please enter a valid demo card number."
      );
      return;
    }

    if (!consent) {
      setError(
        "Please provide recurring-payment consent."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API}/subscriptions/enroll`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              customerName:
                customerName.trim(),

              plan:
                selectedProduct.name,

              amount:
                selectedProduct.monthly,

              currency: "INR",

              frequency,

              paymentMethod:
                cleanCardNumber,

              consent: true,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Enrollment failed"
        );
      }

      setEnrollment(data);

      setMode(
        "confirmation"
      );

      await loadOperationsData();
    } catch (err) {
      setError(
        err.message
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     PAYMENT SIMULATOR

     IMPORTANT:
     DUPLICATE REQUEST now works on the FIRST click.

     If there is no previous SUCCESS payment:
       1. Create original SUCCESS silently.
       2. Immediately replay same request.
       3. Backend detects same idempotency key.
       4. UI shows duplicate response.

     If a SUCCESS already exists:
       Replay that same request directly.
  ======================================================= */

  async function simulatePayment(
    outcome
  ) {
    setSelectedOutcome(
      outcome
    );

    setPaymentResponse(
      null
    );

    try {
      /* ===================================================
         DUPLICATE REQUEST
      =================================================== */

      if (
        outcome ===
        "DUPLICATE"
      ) {
        let duplicateKey =
          lastIdempotencyKey;

        /*
          FIRST CLICK CASE

          No previous SUCCESS exists.

          Create the original SUCCESS request
          silently so that we can immediately
          replay it.
        */

        if (!duplicateKey) {
          duplicateKey =
            `demo-SUCCESS-${Date.now()}`;

          const originalResponse =
            await fetch(
              `${API}/payments/simulate`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  subscriptionId:
                    selectedSubscription ||
                    "SUB-10001",

                  outcome:
                    "SUCCESS",

                  amount: 999,

                  idempotencyKey:
                    duplicateKey,
                }),
              }
            );

          const originalData =
            await originalResponse.json();

          if (
            !originalResponse.ok
          ) {
            throw new Error(
              originalData.error ||
                "Unable to create original payment"
            );
          }

          setLastIdempotencyKey(
            duplicateKey
          );
        }

        /*
          SECOND REQUEST

          Send exactly the same idempotency
          key again.

          Backend should return:
            duplicate: true

          and the original payment ID.
        */

        const duplicateResponse =
          await fetch(
            `${API}/payments/simulate`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                subscriptionId:
                  selectedSubscription ||
                  "SUB-10001",

                outcome:
                  "SUCCESS",

                amount: 999,

                idempotencyKey:
                  duplicateKey,
              }),
            }
          );

        const duplicateData =
          await duplicateResponse.json();

        if (
          !duplicateResponse.ok
        ) {
          throw new Error(
            duplicateData.error ||
              "Duplicate request failed"
          );
        }

        setPaymentResponse(
          duplicateData
        );

        await loadOperationsData();

        if (
          selectedSubscription
        ) {
          await loadEvents(
            selectedSubscription
          );
        }

        return;
      }

      /* ===================================================
         NORMAL PAYMENT SCENARIOS
      =================================================== */

      const key =
        `demo-${outcome}-${Date.now()}`;

      /*
        Save SUCCESS key for future
        DUPLICATE REQUEST testing.
      */

      if (
        outcome ===
        "SUCCESS"
      ) {
        setLastIdempotencyKey(
          key
        );
      }

      const response =
        await fetch(
          `${API}/payments/simulate`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              subscriptionId:
                selectedSubscription ||
                "SUB-10001",

              outcome,

              amount: 999,

              idempotencyKey:
                key,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Payment simulation failed"
        );
      }

      setPaymentResponse(
        data
      );

      await loadOperationsData();

      if (
        selectedSubscription
      ) {
        await loadEvents(
          selectedSubscription
        );
      }
    } catch (err) {
      setPaymentResponse({
        error:
          err.message,
      });
    }
  }

  /* =======================================================
     RECONCILIATION
  ======================================================= */

  async function reconcile(
    paymentId
  ) {
    try {
      const response =
        await fetch(
          `${API}/payments/${paymentId}/reconcile`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Reconciliation failed"
        );
      }

      setPaymentResponse(
        data
      );

      await loadOperationsData();

      if (
        selectedSubscription
      ) {
        await loadEvents(
          selectedSubscription
        );
      }
    } catch (err) {
      setPaymentResponse({
        error:
          err.message,
      });
    }
  }

  /* =======================================================
     SUBSCRIPTION MANAGEMENT
  ======================================================= */

  async function subscriptionAction(
    subscriptionId,
    action
  ) {
    try {
      const response =
        await fetch(
          `${API}/subscriptions/${subscriptionId}/${action}`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Unable to ${action} subscription`
        );
      }

      await loadOperationsData();

      if (
        selectedSubscription
      ) {
        await loadEvents(
          selectedSubscription
        );
      }
    } catch (err) {
      console.error(
        err
      );
    }
  }

  /* =======================================================
     STORE HEADER
  ======================================================= */

  function StoreHeader() {
    return (
      <header className="store-header">
        <div
          className="brand"
          onClick={() =>
            setMode("store")
          }
        >
          Subscribe n Save
        </div>

        <nav>
          <button
            className={
              mode === "store"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              setMode("store")
            }
          >
            Store
          </button>

          <button
            onClick={() => {
              setMode("ops");
              loadOperationsData();
            }}
          >
            Operations Console
          </button>
        </nav>
      </header>
    );
  }

  /* =======================================================
     STORE
  ======================================================= */

  function Store() {
    return (
      <>
        <section className="hero">
          <div>
            <div className="eyebrow">
              SUBSCRIBE & SAVE
            </div>

            <h1>
              Your essentials.
              <br />
              Delivered automatically.
            </h1>

            <p>
              Subscribe once, save every
              cycle, and let us take care
              of the rest.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            <div>
              <h2>
                Choose a product
              </h2>

              <p>
                Subscribe and save compared
                with one-time purchase.
              </p>
            </div>
          </div>

          <div className="product-grid">
            {products.map(
              (product) => (
                <div
                  className="product-card"
                  key={product.id}
                >
                  <div className="product-icon">
                    {product.id ===
                    "coffee"
                      ? "☕"
                      : "📦"}
                  </div>

                  <h3>
                    {product.name}
                  </h3>

                  <p>
                    {
                      product.description
                    }
                  </p>

                  <div className="price-row">
                    <strong>
                      ₹
                      {
                        product.monthly
                      }
                    </strong>

                    <span>
                      / month
                    </span>
                  </div>

                  <div className="saving">
                    {
                      product.saving
                    }
                  </div>

                  <button
                    className="primary full-width"
                    onClick={() =>
                      openProduct(
                        product
                      )
                    }
                  >
                    Subscribe & Save
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      </>
    );
  }

  /* =======================================================
     PRODUCT DETAILS
  ======================================================= */

  function ProductDetails() {
    if (!selectedProduct) {
      return null;
    }

    return (
      <section className="customer-page">
        <button
          className="back-button"
          onClick={() =>
            setMode("store")
          }
        >
          ← Back to products
        </button>

        <div className="product-detail">
          <div className="product-detail-icon">
            {selectedProduct.id ===
            "coffee"
              ? "☕"
              : "📦"}
          </div>

          <div>
            <div className="eyebrow">
              SUBSCRIBE & SAVE
            </div>

            <h1>
              {
                selectedProduct.name
              }
            </h1>

            <p>
              {
                selectedProduct.description
              }
            </p>

            <div className="detail-price">
              ₹
              {
                selectedProduct.monthly
              }

              <span>
                / month
              </span>
            </div>

            <div className="saving large">
              {
                selectedProduct.saving
              }
            </div>

            <h3>
              Delivery frequency
            </h3>

            <select
              value={frequency}
              onChange={(e) =>
                setFrequency(
                  e.target.value
                )
              }
            >
              <option value="MONTHLY">
                Monthly
              </option>

              <option value="WEEKLY">
                Weekly
              </option>
            </select>

            <div className="benefits">
              <div>
                ✓ Automatic recurring
                delivery
              </div>

              <div>
                ✓ Subscribe & Save
                pricing
              </div>

              <div>
                ✓ Manage or cancel
                anytime
              </div>

              <div>
                ✓ Secure payment
                tokenization
              </div>
            </div>

            <button
              className="primary"
              onClick={
                startCheckout
              }
            >
              Continue to Checkout
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     CONFIRMATION
  ======================================================= */

  function Confirmation() {
    if (!enrollment) {
      return null;
    }

    const {
      subscription,
      payment,
    } = enrollment;

    return (
      <section className="customer-page">
        <div className="confirmation-card">
          <div className="success-icon">
            ✓
          </div>

          <div className="eyebrow">
            SUBSCRIPTION CONFIRMED
          </div>

          <h1>
            You're all set!
          </h1>

          <p>
            Your Subscribe & Save
            subscription is now active.
          </p>

          <div className="confirmation-grid">
            <div>
              <span>
                Subscription ID
              </span>

              <strong>
                {
                  subscription.id
                }
              </strong>
            </div>

            <div>
              <span>
                Plan
              </span>

              <strong>
                {
                  subscription.plan
                }
              </strong>
            </div>

            <div>
              <span>
                Recurring amount
              </span>

              <strong>
                ₹
                {
                  subscription.amount
                }
              </strong>
            </div>

            <div>
              <span>
                Next payment
              </span>

              <strong>
                {
                  subscription.nextBillingDate
                }
              </strong>
            </div>

            <div>
              <span>
                Payment method
              </span>

              <strong>
                {
                  subscription.paymentMethod
                }
              </strong>
            </div>

            <div>
              <span>
                Initial payment
              </span>

              <strong>
                {
                  payment.status
                }
              </strong>
            </div>
          </div>

          <div className="payment-explanation">
            <strong>
              Payment flow
            </strong>

            <p>
              Your initial payment was
              a{" "}
              <b>
                CIT (Customer Initiated
                Transaction)
              </b>
              . Future scheduled
              subscription payments will
              be{" "}
              <b>
                MIT (Merchant Initiated
                Transactions)
              </b>
              .
            </p>
          </div>

          <button
            className="primary"
            onClick={() => {
              setMode("ops");
              loadOperationsData();
            }}
          >
            Open Operations Console
          </button>
        </div>
      </section>
    );
  }

  /* =======================================================
     DASHBOARD
  ======================================================= */

  function Dashboard() {
    const active =
      subscriptions.filter(
        (s) =>
          s.status ===
          "ACTIVE"
      ).length;

    const retry =
      subscriptions.filter(
        (s) =>
          s.status ===
          "PAYMENT_RETRY"
      ).length;

    const paused =
      subscriptions.filter(
        (s) =>
          s.status ===
          "PAUSED"
      ).length;

    const unknown =
      payments.filter(
        (p) =>
          p.status ===
          "UNKNOWN"
      ).length;

    return (
      <>
        <div className="page-header">
          <div>
            <h1>
              Operations Dashboard
            </h1>

            <p>
              Payment and subscription
              operations overview.
            </p>
          </div>
        </div>

        <div className="metrics">
          <div className="metric">
            <span>
              Total subscriptions
            </span>

            <strong>
              {
                subscriptions.length
              }
            </strong>
          </div>

          <div className="metric">
            <span>
              Active
            </span>

            <strong>
              {active}
            </strong>
          </div>

          <div className="metric">
            <span>
              Payment retry
            </span>

            <strong>
              {retry}
            </strong>
          </div>

          <div className="metric">
            <span>
              Paused
            </span>

            <strong>
              {paused}
            </strong>
          </div>

          <div className="metric">
            <span>
              Unknown payments
            </span>

            <strong>
              {unknown}
            </strong>
          </div>
        </div>
      </>
    );
  }

  /* =======================================================
     SUBSCRIPTION MANAGEMENT
  ======================================================= */

  function SubscriptionManagement() {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Subscriptions
            </h2>

            <p>
              Manage subscription
              lifecycle.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  Customer
                </th>
                <th>
                  Plan
                </th>
                <th>
                  Amount
                </th>
                <th>
                  Status
                </th>
                <th>
                  Next Billing
                </th>
                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {subscriptions.map(
                (s) => (
                  <tr
                    key={s.id}
                  >
                    <td>
                      {s.id}
                    </td>

                    <td>
                      {
                        s.customer
                      }
                    </td>

                    <td>
                      {s.plan}
                    </td>

                    <td>
                      ₹
                      {s.amount}
                    </td>

                    <td>
                      <span
                        className={`status ${s.status}`}
                      >
                        {
                          s.status
                        }
                      </span>
                    </td>

                    <td>
                      {
                        s.nextBillingDate
                      }
                    </td>

                    <td>
                      <div className="action-buttons">
                        {s.status ===
                          "ACTIVE" && (
                          <button
                            onClick={() =>
                              subscriptionAction(
                                s.id,
                                "pause"
                              )
                            }
                          >
                            Pause
                          </button>
                        )}

                        {s.status ===
                          "PAUSED" && (
                          <button
                            onClick={() =>
                              subscriptionAction(
                                s.id,
                                "resume"
                              )
                            }
                          >
                            Resume
                          </button>
                        )}

                        {s.status !==
                          "CANCELLED" && (
                          <button
                            onClick={() =>
                              subscriptionAction(
                                s.id,
                                "cancel"
                              )
                            }
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  /* =======================================================
     PAYMENT SIMULATOR
  ======================================================= */

  function PaymentSimulator() {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Recurring Payment Simulator
            </h2>

            <p>
              Simulate PSP outcomes for
              MIT recurring payments.
            </p>
          </div>
        </div>

        <div className="simulator">
          <label>
            Subscription

            <select
              value={
                selectedSubscription ||
                ""
              }
              onChange={(e) =>
                setSelectedSubscription(
                  e.target.value
                )
              }
            >
              {subscriptions.map(
                (s) => (
                  <option
                    key={s.id}
                    value={s.id}
                  >
                    {s.id} —{" "}
                    {
                      s.customer
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <div className="scenario-buttons">

            {/* SUCCESS */}

            <button
              className={
                selectedOutcome ===
                "SUCCESS"
                  ? "scenario selected success"
                  : "scenario"
              }
              onClick={() =>
                simulatePayment(
                  "SUCCESS"
                )
              }
            >
              SUCCESS
            </button>

            {/* DECLINED */}

            <button
              className={
                selectedOutcome ===
                "DECLINED"
                  ? "scenario selected decline"
                  : "scenario"
              }
              onClick={() =>
                simulatePayment(
                  "DECLINED"
                )
              }
            >
              DECLINE
            </button>

            {/* UNKNOWN */}

            <button
              className={
                selectedOutcome ===
                "UNKNOWN"
                  ? "scenario selected unknown"
                  : "scenario"
              }
              onClick={() =>
                simulatePayment(
                  "UNKNOWN"
                )
              }
            >
              TIMEOUT / UNKNOWN
            </button>

            {/* 3DS */}

            <button
              className={
                selectedOutcome ===
                "3DS_REQUIRED"
                  ? "scenario selected three-ds"
                  : "scenario"
              }
              onClick={() =>
                simulatePayment(
                  "3DS_REQUIRED"
                )
              }
            >
              3DS REQUIRED
            </button>

            {/* DUPLICATE */}

            <button
              className={
                selectedOutcome ===
                "DUPLICATE"
                  ? "scenario selected duplicate"
                  : "scenario"
              }
              onClick={() =>
                simulatePayment(
                  "DUPLICATE"
                )
              }
            >
              DUPLICATE REQUEST
            </button>
          </div>
        </div>

        {paymentResponse && (
          <div className="response-box">
            <div className="response-title">
              Payment Response
            </div>

            <pre>
              {JSON.stringify(
                paymentResponse,
                null,
                2
              )}
            </pre>
          </div>
        )}
      </section>
    );
  }

  /* =======================================================
     TIMELINE
  ======================================================= */

  function Timeline() {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Timeline
            </h2>

            <p>
              Subscription event and audit
              trail.
            </p>
          </div>
        </div>

        <div className="timeline">
          {events.length ===
          0 ? (
            <p>
              Select a subscription to view
              events.
            </p>
          ) : (
            events.map(
              (
                event,
                index
              ) => (
                <div
                  className="timeline-item"
                  key={index}
                >
                  <div className="timeline-dot" />

                  <div>
                    <strong>
                      {
                        event.text
                      }
                    </strong>

                    <small>
                      {
                        event.time
                      }
                    </small>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>
    );
  }

  /* =======================================================
     RECONCILIATION
  ======================================================= */

  function Reconciliation() {
    const unknownPayments =
      payments.filter(
        (p) =>
          p.status ===
          "UNKNOWN"
      );

    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Reconciliation
            </h2>

            <p>
              Resolve UNKNOWN payments
              before another charge is
              attempted.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  Payment ID
                </th>

                <th>
                  Subscription
                </th>

                <th>
                  Amount
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map(
                (p) => (
                  <tr
                    key={p.id}
                  >
                    <td>
                      {p.id}
                    </td>

                    <td>
                      {
                        p.subscriptionId
                      }
                    </td>

                    <td>
                      ₹
                      {p.amount}
                    </td>

                    <td>
                      <span
                        className={`status ${p.status}`}
                      >
                        {
                          p.status
                        }
                      </span>
                    </td>

                    <td>
                      {p.status ===
                      "UNKNOWN" ? (
                        <button
                          className="primary"
                          onClick={() =>
                            reconcile(
                              p.id
                            )
                          }
                        >
                          Reconcile
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {unknownPayments.length ===
          0 && (
          <div className="success-message">
            ✓ No UNKNOWN payments
            require reconciliation.
          </div>
        )}
      </section>
    );
  }

  /* =======================================================
     TRACEABILITY
  ======================================================= */

  function Traceability() {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Requirement Traceability
            </h2>

            <p>
              Business requirement →
              feature → implementation.
            </p>
          </div>
        </div>

        <div className="traceability">
          <div>
            <strong>
              BR-01
            </strong>

            <span>
              Customer can subscribe to a
              product and provide recurring
              payment consent.
            </span>

            <em>
              Enrollment / Consent
            </em>
          </div>

          <div>
            <strong>
              BR-02
            </strong>

            <span>
              Initial payment is customer
              initiated.
            </span>

            <em>
              CIT Payment
            </em>
          </div>

          <div>
            <strong>
              BR-03
            </strong>

            <span>
              Future payments are
              automatically triggered
              according to the billing
              schedule.
            </span>

            <em>
              MIT / Scheduler
            </em>
          </div>

          <div>
            <strong>
              BR-04
            </strong>

            <span>
              UNKNOWN payment must be
              reconciled before another
              charge.
            </span>

            <em>
              Reconciliation
            </em>
          </div>

          <div>
            <strong>
              BR-05
            </strong>

            <span>
              Duplicate payment requests
              must not result in duplicate
              charges.
            </span>

            <em>
              Idempotency
            </em>
          </div>

          <div>
            <strong>
              BR-06
            </strong>

            <span>
              Customer can pause, resume
              and cancel subscription.
            </span>

            <em>
              Subscription Lifecycle
            </em>
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     OPERATIONS CONSOLE
  ======================================================= */

  function OperationsConsole() {
    return (
      <div className="ops-shell">
        <div className="ops-topbar">
          <div>
            <strong>
              Subscribe n Save
            </strong>

            <span>
              Operations Console
            </span>
          </div>

          <button
            onClick={() =>
              setMode("store")
            }
          >
            ← Customer Store
          </button>
        </div>

        <div className="ops-content">
          <Dashboard />

          <SubscriptionManagement />

          <PaymentSimulator />

          <Timeline />

          <Reconciliation />

          <Traceability />
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  return (
    <div>
      {mode !== "ops" && (
        <StoreHeader />
      )}

      {mode === "store" && (
        <Store />
      )}

      {mode === "product" && (
        <ProductDetails />
      )}

      {mode === "checkout" && (
        <Checkout
          selectedProduct={
            selectedProduct
          }
          frequency={frequency}
          customerName={
            customerName
          }
          setCustomerName={
            setCustomerName
          }
          cardNumber={
            cardNumber
          }
          setCardNumber={
            setCardNumber
          }
          consent={consent}
          setConsent={
            setConsent
          }
          error={error}
          loading={loading}
          startBack={
            backFromCheckout
          }
          enrollSubscription={
            enrollSubscription
          }
        />
      )}

      {mode === "confirmation" && (
        <Confirmation />
      )}

      {mode === "ops" && (
        <OperationsConsole />
      )}
    </div>
  );
}

/* =========================================================
   ROOT
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
