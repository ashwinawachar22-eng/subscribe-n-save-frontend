import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";
const API="http://localhost:4000/api";
function App(){
 const [tab,setTab]=useState("dashboard"),[subs,setSubs]=useState([]),[payments,setPayments]=useState([]),[result,setResult]=useState(null),[events,setEvents]=useState([]);
 const load=async()=>{setSubs(await (await fetch(API+"/subscriptions")).json());setPayments(await (await fetch(API+"/payments")).json())};
 useEffect(()=>{load()},[]);
 const simulate=async(outcome)=>{const r=await fetch(API+"/payments/simulate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscriptionId:"SUB-10001",outcome,idempotencyKey:"SUB-10001-20261012-01"})});setResult(await r.json());load()};
 const reconcile=async(id)=>{const r=await fetch(API+"/payments/"+id+"/reconcile",{method:"POST"});setResult(await r.json());load()};
 const loadEvents=async(id)=>setEvents(await (await fetch(API+"/subscriptions/"+id+"/events")).json());
 return <><header><h1>Subscribe n Save</h1><p>Full-stack Payment & Subscription Simulator</p></header>
 <nav>{["dashboard","subscriptions","payment","timeline","reconciliation","traceability"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)}>{x.replace("traceability","traceability").replace("reconciliation","reconciliation").toUpperCase()}</button>)}</nav>
 <main>
 {tab==="dashboard"&&<><h2>Operations Dashboard</h2><div className="grid">{[["Active","982"],["Payment Retry","42"],["Suspended","18"],["Unknown","5"]].map(x=><div className="card"><small>{x[0]}</small><b>{x[1]}</b></div>)}</div><div className="card"><h3>Architecture</h3><p>Frontend → REST API → Backend → Mock PSP → Payment state → Webhook → Database/state.</p><p className="note">This is a learning simulator. No real card or payment processing occurs.</p></div></>}
 {tab==="subscriptions"&&<><h2>Subscriptions</h2><div className="card"><table><thead><tr><th>ID</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Next Billing</th><th>Status</th><th>Actions</th></tr></thead><tbody>{subs.map(s=><tr><td>{s.id}</td><td>{s.customer}</td><td>{s.plan}</td><td>₹{s.amount}</td><td>{s.nextBillingDate}</td><td><span className="badge">{s.status}</span></td><td><button onClick={async()=>{await fetch(API+"/subscriptions/"+s.id+"/pause",{method:"POST"});load()}}>Pause</button> <button onClick={async()=>{await fetch(API+"/subscriptions/"+s.id+"/resume",{method:"POST"});load()}}>Resume</button></td></tr>)}</tbody></table></div></>}
 {tab==="payment"&&<><h2>Payment Simulator</h2><div className="two"><div className="card"><h3>Recurring MIT</h3><p>SUB-10001 · ₹999 INR · Tokenized card •••• 4242</p><button className="primary" onClick={()=>simulate("SUCCESS")}>SUCCESS</button> <button onClick={()=>simulate("DECLINED")}>DECLINE</button> <button onClick={()=>simulate("UNKNOWN")}>TIMEOUT / UNKNOWN</button><button onClick={()=>simulate("3DS_REQUIRED")}>3DS REQUIRED</button>{result&&<pre>{JSON.stringify(result,null,2)}</pre>}</div><div className="card"><h3>What happens</h3><p>Scheduler → payment orchestrator → mock PSP → outcome → webhook → subscription/billing state.</p><p><b>Key BA rule:</b> UNKNOWN is not treated as DECLINED; reconcile before another charge.</p></div></div></>}
 {tab==="timeline"&&<><h2>Payment Timeline</h2><div className="card"><button onClick={()=>loadEvents("SUB-10001")}>Load SUB-10001</button><div className="timeline">{events.map(e=><div><b>{e.time}</b> — {e.text}</div>)}</div></div></>}
 {tab==="reconciliation"&&<><h2>Reconciliation</h2><div className="card"><table><thead><tr><th>Payment</th><th>Subscription</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.map(p=><tr><td>{p.id}</td><td>{p.subscriptionId}</td><td>₹{p.amount}</td><td><span className="badge">{p.status}</span></td><td>{p.status==="UNKNOWN"&&<button onClick={()=>reconcile(p.id)}>Reconcile</button>}</td></tr>)}</tbody></table>{result&&<pre>{JSON.stringify(result,null,2)}</pre>}</div></>}
 {tab==="traceability"&&<><h2>Requirement Traceability</h2><div className="card"><table><tbody>{[["Recurring billing","US-22","Payment Simulator"],["Idempotency","US-24","Backend payment API"],["3DS / 3RI","US-32","Payment Simulator"],["Retry","US-46","Decline scenario"],["Unknown + reconciliation","US-43/44","Reconciliation"],["Pause / Resume","US-54/56","Subscriptions"]].map(x=><tr><td>{x[0]}</td><td>{x[1]}</td><td>{x[2]}</td></tr>)}</tbody></table></div></>}
 </main></>
}
createRoot(document.getElementById("root")).render(<App/>);
