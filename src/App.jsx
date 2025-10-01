import React, { useState } from "react";
import Globe from "./Globe";
import "./index.css";

export default function App() {
  const [info, setInfo] = useState(null);

  return (
    <div className="app">
      <Globe onShowInfo={setInfo} />
      {info && (
        <div className="info-panel">
          <h2>{info.title}</h2>
          <p>{info.description}</p>
          <button onClick={() => setInfo(null)}>X</button>
        </div>
      )}
    </div>
  );
}