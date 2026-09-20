import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

class BootError extends Component<{ children: ReactNode }, { error?: Error }> {
    state = { error: undefined as Error | undefined };
    static getDerivedStateFromError(error: Error) { return { error }; }
    componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info.componentStack); }
    render() {
        if (!this.state.error) return this.props.children;
        return (
            <main className="home-screen">
                <div className="home-card">
                    <p className="eyebrow">GAMEFORGE</p>
                    <h1>Could not start</h1>
                    <p>{this.state.error.message}</p>
                    <button className="primary" type="button" onClick={() => location.reload()}>Reload</button>
                </div>
            </main>
        );
    }
}

const root = createRoot(document.getElementById("root")!);
if (import.meta.env.DEV && new URLSearchParams(location.search).get("verify") === "sandbox") {
    void import("./sandbox/verification").then(({ default: Verification }) => root.render(<Verification />));
} else if (import.meta.env.DEV && new URLSearchParams(location.search).get("verify") === "creator") {
    void import("./creator/verification").then(({ default: Verification }) => root.render(<Verification />));
} else root.render(<StrictMode><BootError><App /></BootError></StrictMode>);
