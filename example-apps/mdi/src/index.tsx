import { createRoot } from "react-dom/client";
import "./setup-twind";

const App = () => {
  return <div className="p-4 text-blue-500">hello</div>;
};

const rootElement = document.getElementById("app")!;
const root = createRoot(rootElement);
root.render(<App />);
