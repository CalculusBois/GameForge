import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root=createRoot(document.getElementById("root")!);
if(import.meta.env.DEV&&new URLSearchParams(location.search).get('verify')==='sandbox'){
 void import('./sandbox/verification').then(({default:Verification})=>root.render(<Verification/>));
}else root.render(<StrictMode><App/></StrictMode>);
