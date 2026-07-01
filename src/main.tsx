import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error(err); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, color: "#FF3B30", background: "#F5F5F7", height: "100%", fontFamily: "var(--font-sans)" }}>
          <h2 style={{ marginTop: 0 }}>出错了</h2>
          <pre style={{ background: "#fff", padding: 12, borderRadius: 8, overflow: "auto" }}>{this.state.err.message}</pre>
          <button className="btn-primary" onClick={() => location.reload()}>重新加载</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);