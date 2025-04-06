import TldrawComponent from "./TldrawComponent";
import "./index.css";

export default function App() {
  return (
    <div className="app-container">
      <h1>Hub and Spoke Diagram</h1>
      <div className="tldraw-wrapper">
        <div className="tldraw-container">
          <TldrawComponent inferDarkMode />
        </div>
      </div>
    </div>
  );
}