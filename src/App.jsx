import React, { useState } from "react";
import Globe from "./Globe";
import "./index.css";

export default function App() {
  const [info, setInfo] = useState(null);
  const [mydata, setMydata] = useState(null);

  return (
    <div className="app">
      <Globe onShowInfo={setInfo} onShowMydata={setMydata} />
      {info && (
        <div className="info-panel">
          <h2>{info.title}</h2>
          <p>{info.description}</p>
          <button onClick={() => setInfo(null)}>X</button>
        </div>
      )}
      {mydata && (
        <div className="info-panel">
          <img src="me.jpg" alt="Mahan" />
          <h2>Mahan</h2>
          <p>About me: I get into programming because of my love of the games.
            Unfortunately, I don't have much time to play games anymore 😔 <br />
            hobby: Watching movies<br />
            Favorite game: The Witcher 3 <br />
            Favorite Food: 🍕Pizza <br />
            Favorite Color: <span style={{ color: "cyan" }}>Cyan</span> <br />
            Hidden fact about me 🤫: I am super introvert but I try to be social as much as I can. <br />
            What do I want from this Internship: experience Dutch company culture, learn more about XR and how to mix my experience with this technology.<br />
          </p>

          <button onClick={() => setMydata(null)}>X</button>
        </div>
      )}
    </div>
  );
}