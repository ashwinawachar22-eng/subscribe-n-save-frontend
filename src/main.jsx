import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = "https://subscribe-n-save-backend.vercel.app/api";

function App() {
  const [tab, setTab] = useState("dashboard");
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState(null);

  async function loadData() {
    const s = await fetch(`${API}/subscriptions`);
    const p = await fetch(`${API}/payments`);

    setSubscriptions(await s.json());
    setPayments(await p.json());
  }

  useEffect(() => {
    loadData();
  }, []);

  async function simulate(outcome, forceDuplicate = false) {
    const idempotencyKey = forceDuplicate
      ? lastIdempotencyKey
      : `SUB-10001-${Date.now()}`;

    if (!idempotencyKey) {
      setResult({
        error: "Run a payment scenario first before testing duplicate request."
      });
      return;
    }

    if (!forceDuplicate) {
      setLastIdempotencyKey(idempotencyKey);
    }

    const response = await fetch(`${API}/payments/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscriptionId: "SUB-10001",
        outcome: outcome,
        amount: 999,
        idempotencyKey: idempotencyKey
      })
    });

    setResult(await response.json());
    loadData();
  }

  async function reconcile(paymentId) {
    const response = await fetch(
      `${API}/payments/${paymentId}/reconcile`,
      { method: "POST" }
    );

    setResult(await response.json());
    loadData();
  }

  async function loadEvents(subscriptionId) {
    const response = await fetch(
      `${API}/subscriptions/${subscriptionId}/events`
    );

    setEvents(await response.json());
  }

  async function subscriptionAction(id, action) {
    await fetch(`${API}/subscriptions/${id}/${action}`, {
      method: "POST"
    });

    loadData();
  }

  return (
    <>
      <header>
        <h1>Subscribe n Save</h1>
        <p>Payment & Subscription Simulator</p>
      </header>

      <nav>
        {[
          "dashboard",
          "subscriptions",
          "payment",
          "timeline",
          "reconciliation",
          "traceability"
        ].map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </nav>

      <main>
        {tab === "dashboard" && (
          <>
            <h2>Operations Dashboard</h2>

            <div className="grid">
              <div className="card">
                <small>Active subscriptions</small>
                <b>982</b>
              </div>

              <div className="card">
                <small>Payment retry</small>
                <b>42</b>
              </div>

              <div className="card">
                <small>Suspended</small>
                <b>18</b>
              </div>

              <div className="card">
                <small>Unknown payments</small>
                <b>5</b>
              </div>
            </div>

            <div className="card">
              <h3>Architecture</h3>

              <p>
                Customer → Merchant → PSP → Acquirer →
                Card Network → Issuer
              </p>

              <p className="note">
                This is a learning simulator. No real payment is processed.
              </p>
            </div>
          </>
        )}

        {tab === "subscriptions" && (
          <>
            <h2>Subscription Management</h2>

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
                  {subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.customer}</td>
                      <td>{s.plan}</td>
                      <td>₹{s.amount}</td>
                      <td>{s.nextBillingDate}</td>

                      <td>
                        <span className="badge">
                          {s.status}
                        </span>
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            subscriptionAction(s.id, "pause")
                          }
                        >
                          Pause
                        </button>

                        <button
                          onClick={() =>
                            subscriptionAction(s.id, "resume")
                          }
                        >
                          Resume
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "payment" && (
          <>
            <h2>Payment Simulator</h2>

            <div className="two">
              <div className="card">
                <h3>Recurring Payment</h3>

                <p>
                  <b>Subscription:</b> SUB-10001
                </p>

                <p>
                  <b>Amount:</b> ₹999 INR
                </p>

                <p>
                  <b>Payment Type:</b> Merchant-Initiated Transaction
                  (MIT)
                </p>

                <p>
                  <b>Payment Method:</b> Tokenized card •••• 4242
                </p>

                <button
                  className="primary"
                  onClick={() => simulate("SUCCESS")}
                >
                  SUCCESS
                </button>

                <button
                  onClick={() => simulate("DECLINED")}
                >
                  DECLINE
                </button>

                <button
                  onClick={() => simulate("UNKNOWN")}
                >
                  TIMEOUT / UNKNOWN
                </button>

                <button
                  onClick={() => simulate("3DS_REQUIRED")}
                >
                  3DS REQUIRED
                </button>

                <button
                  onClick={() => simulate("SUCCESS", true)}
                >
                  DUPLICATE REQUEST
                </button>
              </div>

              <div className="card">
                <h3>Payment Response</h3>

                {result ? (
                  <pre>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <p>Select a payment outcome.</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3>BA Rules Demonstrated</h3>

              <ul>
                <li>
                  Idempotency prevents duplicate payment attempts.
                </li>

                <li>
                  UNKNOWN is not automatically treated as DECLINED.
                </li>

                <li>
                  UNKNOWN requires reconciliation.
                </li>

                <li>
                  Successful payment advances the billing cycle.
                </li>

                <li>
                  Retryable declines can enter payment retry.
                </li>

                <li>
                  Duplicate requests using the same idempotency key
                  are rejected safely.
                </li>
              </ul>
            </div>
          </>
        )}

        {tab === "timeline" && (
          <>
            <h2>Payment Timeline</h2>

            <div className="card">
              <button
                className="primary"
                onClick={() =>
                  loadEvents("SUB-10001")
                }
              >
                Load SUB-10001
              </button>

              <div className="timeline">
                {events.map((event, index) => (
                  <div key={index}>
                    <b>{event.time}</b>
                    {" — "}
                    {event.text}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "reconciliation" && (
          <>
            <h2>Payment Reconciliation</h2>

            <div className="note">
              UNKNOWN/TIMEOUT must not automatically become
              DECLINED. Reconcile before another charge.
            </div>

            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Subscription</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.id}</td>

                      <td>{payment.subscriptionId}</td>

                      <td>₹{payment.amount}</td>

                      <td>
                        <span className="badge">
                          {payment.status}
                        </span>
                      </td>

                      <td>
                        {payment.status === "UNKNOWN" && (
                          <button
                            onClick={() =>
                              reconcile(payment.id)
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

        {tab === "traceability" && (
          <>
            <h2>Requirement Traceability</h2>

            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Business Requirement</th>
                    <th>User Story</th>
                    <th>Implementation</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Recurring billing</td>
                    <td>US-22</td>
                    <td>Payment Simulator</td>
                  </tr>

                  <tr>
                    <td>Duplicate prevention</td>
                    <td>US-24</td>
                    <td>Idempotency Key</td>
                  </tr>

                  <tr>
                    <td>3DS / 3RI</td>
                    <td>US-32</td>
                    <td>Authentication simulation</td>
                  </tr>

                  <tr>
                    <td>Payment retry</td>
                    <td>US-46</td>
                    <td>Decline scenario</td>
                  </tr>

                  <tr>
                    <td>UNKNOWN reconciliation</td>
                    <td>US-43 / US-44</td>
                    <td>Reconciliation API</td>
                  </tr>

                  <tr>
                    <td>Pause / Resume</td>
                    <td>US-54 / US-56</td>
                    <td>Subscription API</td>
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
).render(<App />);
