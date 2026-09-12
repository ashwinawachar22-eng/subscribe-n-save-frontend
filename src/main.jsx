import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = "https://subscribe-n-save-backend.vercel.app/api";

const products = [
  {
    id: "coffee",
    name: "Premium Coffee",
    description:
      "Fresh premium coffee delivered to your doorstep.",
    oneTime: 1099,
    monthly: 999,
    save: "Save ₹100/month"
  },
  {
    id: "essentials",
    name: "Daily Essentials",
    description:
      "Everyday household essentials delivered automatically.",
    oneTime: 549,
    monthly: 499,
    save: "Save ₹50/month"
  }
];

function App() {
  const [mode, setMode] = useState("store");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [frequency, setFrequency] = useState("MONTHLY");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [consent, setConsent] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);

  async function loadData() {
    try {
      const [s, p] = await Promise.all([
        fetch(`${API}/subscriptions`),
        fetch(`${API}/payments`)
      ]);

      setSubscriptions(await s.json());
      setPayments(await p.json());
    } catch (error) {
      setResult({
        error: "Unable to connect to backend",
        details: error.message
      });
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (mode === "ops" && tab === "timeline") {
      loadEvents("SUB-10001");
    }
  }, [mode, tab]);

  function openProduct(product) {
    setSelectedProduct(product);
    setFrequency("MONTHLY");
    setMode("product");
  }

  function startCheckout() {
    setCustomerName("");
    setPaymentMethod("");
    setConsent(false);
    setCheckoutResult(null);
    setMode("checkout");
  }

  async function enroll() {
    if (
      !selectedProduct ||
      !customerName ||
      !paymentMethod ||
      !consent
    ) {
      return;
    }

    const response = await fetch(
      `${API}/subscriptions/enroll`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName,
          plan: selectedProduct.name,
          amount: selectedProduct.monthly,
          currency: "INR",
          frequency,
          paymentMethod,
          consent: true
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setCheckoutResult(data);
      return;
    }

    setCheckoutResult(data);
    setMode("confirmation");
    await loadData();
  }

  /*
   * ==========================================================
   * PAYMENT SIMULATOR
   * ==========================================================
   */

  async function simulate(outcome) {
    setResult(null);

    /*
     * ========================================================
     * DUPLICATE REQUEST
     * ========================================================
     *
     * One click performs:
     *
     * 1. Original SUCCESS request
     * 2. Exact same request again
     *
     * Both requests carry demoDuplicate=true.
     *
     * The first creates the original payment.
     * The second is detected by idempotency.
     *
     * Timeline:
     *
     * Recurring MIT payment submitted — status: SUCCESS
     * Duplicate payment request detected...
     *
     * There is NO billing-cycle-PAID event for this demo.
     */

    if (outcome === "DUPLICATE") {
      setSelectedOutcome("DUPLICATE");

      try {
        const duplicateKey =
          `DEMO-DUPLICATE-${Date.now()}`;

        /*
         * STEP 1:
         * Create original payment.
         */

        const originalResponse = await fetch(
          `${API}/payments/simulate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              subscriptionId: "SUB-10001",
              outcome: "SUCCESS",
              amount: 999,
              idempotencyKey: duplicateKey,
              demoDuplicate: true
            })
          }
        );

        const originalData =
          await originalResponse.json();

        if (!originalResponse.ok) {
          throw new Error(
            originalData.error ||
              "Original payment creation failed"
          );
        }

        setLastIdempotencyKey(
          duplicateKey
        );

        /*
         * STEP 2:
         * Replay the exact same request.
         */

        const duplicateResponse = await fetch(
          `${API}/payments/simulate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              subscriptionId: "SUB-10001",
              outcome: "SUCCESS",
              amount: 999,
              idempotencyKey: duplicateKey,
              demoDuplicate: true
            })
          }
        );

        const duplicateData =
          await duplicateResponse.json();

        if (!duplicateResponse.ok) {
          throw new Error(
            duplicateData.error ||
              "Duplicate request failed"
          );
        }

        setResult(duplicateData);

        await loadData();
        await loadEvents("SUB-10001");

        return;
      } catch (error) {
        setResult({
          error: error.message
        });

        return;
      }
    }

    /*
     * ========================================================
     * NORMAL PAYMENT SCENARIOS
     * ========================================================
     */

    setSelectedOutcome(outcome);

    try {
      const key =
        `SUB-10001-${Date.now()}`;

      if (outcome === "SUCCESS") {
        setLastIdempotencyKey(key);
      }

      const response = await fetch(
        `${API}/payments/simulate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            subscriptionId: "SUB-10001",
            outcome,
            amount: 999,
            idempotencyKey: key
          })
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

      setResult(data);

      await loadData();
      await loadEvents("SUB-10001");
    } catch (error) {
      setResult({
        error: error.message
      });
    }
  }

  /*
   * ==========================================================
   * RECONCILIATION
   * ==========================================================
   */

  async function reconcile(paymentId) {
    try {
      const response = await fetch(
        `${API}/payments/${paymentId}/reconcile`,
        {
          method: "POST"
        }
      );

      const data =
        await response.json();

      setResult(data);

      await loadData();
      await loadEvents("SUB-10001");
    } catch (error) {
      setResult({
        error: error.message
      });
    }
  }

  /*
   * ==========================================================
   * TIMELINE
   * ==========================================================
   */

  async function loadEvents(subscriptionId) {
    try {
      const response = await fetch(
        `${API}/subscriptions/${subscriptionId}/events`
      );

      const data =
        await response.json();

      setEvents(data);
    } catch (error) {
      console.error(
        "Failed to load events:",
        error
      );
    }
  }

  /*
   * ==========================================================
   * SUBSCRIPTION ACTIONS
   * ==========================================================
   */

  async function subscriptionAction(id, action) {
    try {
      await fetch(
        `${API}/subscriptions/${id}/${action}`,
        {
          method: "POST"
        }
      );

      await loadData();
      await loadEvents(id);
    } catch (error) {
      console.error(
        "Subscription action failed:",
        error
      );
    }
  }

  /*
   * ==========================================================
   * CUSTOMER NAVIGATION
   * ==========================================================
   */

  const customerNav = (
    <div className="customer-nav">
      <div>
        <strong>
          Subscribe n Save
        </strong>

        <span>
          Customer Store
        </span>
      </div>

      <button
        className={
          mode !== "ops"
            ? "active"
            : ""
        }
        onClick={() =>
          setMode("store")
        }
      >
        Store
      </button>

      <button
        className={
          mode === "ops"
            ? "active"
            : ""
        }
        onClick={() =>
          setMode("ops")
        }
      >
        Operations Console
      </button>
    </div>
  );

  /*
   * ==========================================================
   * CUSTOMER STORE
   * ==========================================================
   */

  if (
    mode === "store" ||
    mode === "product" ||
    mode === "checkout" ||
    mode === "confirmation"
  ) {
    return (
      <>
        {customerNav}

        <main className="store-main">

          {mode === "store" && (
            <>
              <div className="store-hero">
                <span className="eyebrow">
                  SUBSCRIBE & SAVE
                </span>

                <h1>
                  Get your essentials
                  delivered automatically.
                </h1>

                <p>
                  Subscribe once, save every
                  month, and let us handle
                  future billing.
                </p>
              </div>

              <h2>
                Choose a product
              </h2>

              <div className="product-grid">
                {products.map(product => (
                  <div
                    className="product-card"
                    key={product.id}
                  >
                    <div className="product-image">
                      {product.id === "coffee"
                        ? "☕"
                        : "📦"}
                    </div>

                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      {product.description}
                    </p>

                    <div className="price-row">
                      <strong>
                        ₹
                        {product.monthly}
                      </strong>

                      <span>
                        / month
                      </span>
                    </div>

                    <div className="save-pill">
                      {product.save}
                    </div>

                    <button
                      className="primary wide"
                      onClick={() =>
                        openProduct(product)
                      }
                    >
                      Subscribe & Save
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {mode === "product" &&
            selectedProduct && (
              <div className="checkout-card">

                <button
                  className="back"
                  onClick={() =>
                    setMode("store")
                  }
                >
                  ← Back to products
                </button>

                <div className="product-detail">

                  <div className="product-image large">
                    {selectedProduct.id === "coffee"
                      ? "☕"
                      : "📦"}
                  </div>

                  <div>
                    <span className="eyebrow">
                      SUBSCRIBE & SAVE
                    </span>

                    <h1>
                      {selectedProduct.name}
                    </h1>

                    <p>
                      {selectedProduct.description}
                    </p>

                    <h2>
                      ₹
                      {selectedProduct.monthly}{" "}
                      <small>
                        / month
                      </small>
                    </h2>

                    <div className="save-pill">
                      {selectedProduct.save}
                    </div>

                    <label>
                      Delivery frequency
                    </label>

                    <select
                      value={frequency}
                      onChange={e =>
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

                    <ul className="benefits">
                      <li>
                        Recurring delivery
                        without re-ordering
                      </li>

                      <li>
                        Secure tokenized
                        payment method
                      </li>

                      <li>
                        Cancel or pause
                        from your subscription
                      </li>
                    </ul>

                    <button
                      className="primary"
                      onClick={
                        startCheckout
                      }
                    >
                      Continue to payment
                    </button>
                  </div>

                </div>
              </div>
            )}

          {mode === "checkout" &&
            selectedProduct && (
              <div className="checkout-card narrow">

                <button
                  className="back"
                  onClick={() =>
                    setMode("product")
                  }
                >
                  ← Back
                </button>

                <span className="eyebrow">
                  CHECKOUT
                </span>

                <h1>
                  Start your subscription
                </h1>

                <div className="order-summary">
                  <div>
                    <span>
                      {selectedProduct.name}
                    </span>

                    <strong>
                      ₹
                      {selectedProduct.monthly}
                      /month
                    </strong>
                  </div>

                  <small>
                    Frequency:{" "}
                    {frequency}
                  </small>
                </div>

                <label>
                  Your name
                </label>

                <input
                  value={customerName}
                  onChange={e =>
                    setCustomerName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Ashwin Awachar"
                />

                <label>
                  Card number
                </label>

                <input
                  value={paymentMethod}
                  onChange={e =>
                    setPaymentMethod(
                      e.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(0, 16)
                    )
                  }
                  placeholder="4242424242424242"
                  inputMode="numeric"
                />

                <div className="consent-box">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e =>
                      setConsent(
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    I authorize recurring
                    payments of ₹
                    {selectedProduct.monthly}{" "}
                    for this subscription
                    according to the
                    subscription terms.
                  </span>
                </div>

                <button
                  className="primary wide"
                  disabled={
                    !customerName ||
                    paymentMethod.length < 12 ||
                    !consent
                  }
                  onClick={enroll}
                >
                  Pay ₹
                  {selectedProduct.monthly}{" "}
                  & Start Subscription
                </button>

                <p className="security-note">
                  Demo only — no real
                  payment is processed.
                </p>
              </div>
            )}

          {mode === "confirmation" &&
            checkoutResult?.subscription && (
              <div className="confirmation-card">

                <div className="success-icon">
                  ✓
                </div>

                <span className="eyebrow">
                  SUBSCRIPTION ACTIVE
                </span>

                <h1>
                  You're all set,{" "}
                  {
                    checkoutResult
                      .subscription
                      .customer
                  }.
                </h1>

                <p>
                  Your{" "}
                  {
                    checkoutResult
                      .subscription
                      .plan
                  }{" "}
                  subscription is now
                  active.
                </p>

                <div className="confirmation-grid">

                  <div>
                    <small>
                      Subscription ID
                    </small>

                    <strong>
                      {
                        checkoutResult
                          .subscription
                          .id
                      }
                    </strong>
                  </div>

                  <div>
                    <small>
                      Recurring amount
                    </small>

                    <strong>
                      ₹
                      {
                        checkoutResult
                          .subscription
                          .amount
                      }
                      /month
                    </strong>
                  </div>

                  <div>
                    <small>
                      Next payment
                    </small>

                    <strong>
                      {
                        checkoutResult
                          .subscription
                          .nextBillingDate
                      }
                    </strong>
                  </div>

                  <div>
                    <small>
                      Payment method
                    </small>

                    <strong>
                      {
                        checkoutResult
                          .subscription
                          .paymentMethod
                      }
                    </strong>
                  </div>

                </div>

                <p className="note">
                  Initial payment was
                  customer-initiated (CIT).
                  Future billing will be
                  merchant-initiated (MIT).
                </p>

                <button
                  className="primary"
                  onClick={() =>
                    setMode("ops")
                  }
                >
                  Open Operations Console
                </button>

                <button
                  onClick={() =>
                    setMode("store")
                  }
                >
                  Back to Store
                </button>

              </div>
            )}

        </main>
      </>
    );
  }

  /*
   * ==========================================================
   * OPERATIONS CONSOLE
   * ==========================================================
   */

  return (
    <>
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

      <nav>
        {[
          "dashboard",
          "subscriptions",
          "payment",
          "timeline",
          "reconciliation",
          "traceability"
        ].map(item => (
          <button
            key={item}
            className={
              tab === item
                ? "active"
                : ""
            }
            onClick={() =>
              setTab(item)
            }
          >
            {item.toUpperCase()}
          </button>
        ))}
      </nav>

      <main>

        {/* DASHBOARD */}

        {tab === "dashboard" && (
          <>
            <h2>
              Operations Dashboard
            </h2>

            <div className="grid">

              <div className="card">
                <small>
                  Subscriptions in demo
                </small>

                <b>
                  {subscriptions.length}
                </b>
              </div>

              <div className="card">
                <small>
                  Payment attempts
                </small>

                <b>
                  {payments.length}
                </b>
              </div>

              <div className="card">
                <small>
                  Payment retry
                </small>

                <b>
                  {
                    subscriptions.filter(
                      s =>
                        s.status ===
                        "PAYMENT_RETRY"
                    ).length
                  }
                </b>
              </div>

              <div className="card">
                <small>
                  Unknown payments
                </small>

                <b>
                  {
                    payments.filter(
                      p =>
                        p.status ===
                        "UNKNOWN"
                    ).length
                  }
                </b>
              </div>

            </div>

            <div className="card">

              <h3>
                End-to-end architecture
              </h3>

              <p>
                Customer → Merchant →
                Payment Orchestrator →
                PSP → Acquirer →
                Card Network → Issuer
              </p>

              <p className="note">
                This is a learning simulator.
                No real payment is processed.
              </p>

            </div>
          </>
        )}

        {/* SUBSCRIPTIONS */}

        {tab === "subscriptions" && (
          <>
            <h2>
              Subscription Management
            </h2>

            <div className="card">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Next Billing</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {subscriptions.map(s => (
                    <tr key={s.id}>

                      <td>
                        {s.id}
                      </td>

                      <td>
                        {s.customer}
                      </td>

                      <td>
                        {s.plan}
                      </td>

                      <td>
                        ₹
                        {s.amount}
                      </td>

                      <td>
                        {s.nextBillingDate}
                      </td>

                      <td>
                        <span className="badge">
                          {s.status}
                        </span>
                      </td>

                      <td>

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

                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          </>
        )}

        {/* PAYMENT */}

        {tab === "payment" && (
          <>
            <h2>
              Recurring Payment Simulator
            </h2>

            <div className="two">

              <div className="card">

                <h3>
                  Merchant-Initiated Payment
                </h3>

                <p>
                  <b>
                    Subscription:
                  </b>{" "}
                  SUB-10001
                </p>

                <p>
                  <b>
                    Amount:
                  </b>{" "}
                  ₹999 INR
                </p>

                <p>
                  <b>
                    Payment Type:
                  </b>{" "}
                  MIT
                </p>

                <p>
                  <b>
                    Payment Method:
                  </b>{" "}
                  Tokenized card
                  •••• 4242
                </p>

                <div className="scenario-buttons">

                  <button
                    className={
                      selectedOutcome ===
                      "SUCCESS"
                        ? "primary selected"
                        : ""
                    }
                    onClick={() =>
                      simulate("SUCCESS")
                    }
                  >
                    SUCCESS
                  </button>

                  <button
                    className={
                      selectedOutcome ===
                      "DECLINED"
                        ? "primary selected"
                        : ""
                    }
                    onClick={() =>
                      simulate("DECLINED")
                    }
                  >
                    DECLINED
                  </button>

                  <button
                    className={
                      selectedOutcome ===
                      "UNKNOWN"
                        ? "primary selected"
                        : ""
                    }
                    onClick={() =>
                      simulate("UNKNOWN")
                    }
                  >
                    TIMEOUT / UNKNOWN
                  </button>

                  <button
                    className={
                      selectedOutcome ===
                      "3DS_REQUIRED"
                        ? "primary selected"
                        : ""
                    }
                    onClick={() =>
                      simulate(
                        "3DS_REQUIRED"
                      )
                    }
                  >
                    3DS REQUIRED
                  </button>

                  <button
                    className={
                      selectedOutcome ===
                      "DUPLICATE"
                        ? "primary selected"
                        : ""
                    }
                    onClick={() =>
                      simulate("DUPLICATE")
                    }
                  >
                    DUPLICATE REQUEST
                  </button>

                </div>

              </div>

              <div className="card">

                <h3>
                  Payment Response
                </h3>

                {result ? (
                  <pre>
                    {JSON.stringify(
                      result,
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  <p>
                    Select a payment
                    outcome.
                  </p>
                )}

              </div>

            </div>
          </>
        )}

        {/* TIMELINE */}

        {tab === "timeline" && (
          <>
            <h2>
              Payment Timeline
            </h2>

            <div className="card">

              <button
                className="primary"
                onClick={() =>
                  loadEvents(
                    "SUB-10001"
                  )
                }
              >
                Refresh SUB-10001
              </button>

              <div className="timeline">

                {events.map(
                  (e, i) => (
                    <div key={i}>
                      <b>
                        {e.time}
                      </b>

                      {" — "}

                      {e.text}
                    </div>
                  )
                )}

              </div>

            </div>
          </>
        )}

        {/* RECONCILIATION */}

        {tab === "reconciliation" && (
          <>
            <h2>
              Payment Reconciliation
            </h2>

            <div className="note">
              UNKNOWN/TIMEOUT must not
              automatically become DECLINED.
              Reconcile before another charge.
            </div>

            <div className="card">

              <table>

                <thead>
                  <tr>
                    <th>
                      Payment
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

                  {payments.map(p => (
                    <tr key={p.id}>

                      <td>
                        {p.id}
                      </td>

                      <td>
                        {p.subscriptionId}
                      </td>

                      <td>
                        ₹
                        {p.amount}
                      </td>

                      <td>
                        <span className="badge">
                          {p.status}
                        </span>
                      </td>

                      <td>
                        {p.status ===
                          "UNKNOWN" && (
                          <button
                            onClick={() =>
                              reconcile(
                                p.id
                              )
                            }
                          >
                            Reconcile
                          </button>
                        )}
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          </>
        )}

        {/* TRACEABILITY */}

        {tab === "traceability" && (
          <>
            <h2>
              Requirement Traceability
            </h2>

            <div className="card">

              <table>

                <thead>
                  <tr>
                    <th>
                      Business Requirement
                    </th>

                    <th>
                      User Story
                    </th>

                    <th>
                      Implementation
                    </th>
                  </tr>
                </thead>

                <tbody>

                  <tr>
                    <td>
                      Subscribe & Save
                      enrollment
                    </td>

                    <td>
                      US-07 to US-10
                    </td>

                    <td>
                      Customer Store +
                      Checkout
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Recurring billing
                    </td>

                    <td>
                      US-22
                    </td>

                    <td>
                      Payment Simulator
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Duplicate prevention
                    </td>

                    <td>
                      US-24
                    </td>

                    <td>
                      Idempotency Key
                    </td>
                  </tr>

                  <tr>
                    <td>
                      3DS / 3RI
                    </td>

                    <td>
                      US-32
                    </td>

                    <td>
                      Authentication
                      simulation
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Payment retry
                    </td>

                    <td>
                      US-46
                    </td>

                    <td>
                      Decline scenario
                    </td>
                  </tr>

                  <tr>
                    <td>
                      UNKNOWN
                      reconciliation
                    </td>

                    <td>
                      US-43 / US-44
                    </td>

                    <td>
                      Reconciliation API
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Pause / Resume /
                      Cancel
                    </td>

                    <td>
                      US-52 to US-56
                    </td>

                    <td>
                      Subscription API
                    </td>
                  </tr>

                </tbody>

              </table>

            </div>
          </>
        )}

      </main>
    </>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <App />
);
