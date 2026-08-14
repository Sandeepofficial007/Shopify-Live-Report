"use client";

import { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("API returned " + res.status);
        return res.json();
      })
      .then((json) => {
        if (json.error) {
          setError(json.error + (json.hint ? " — " + json.hint : ""));
        } else {
          setData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0B0F1A",
          color: "#E2E8F0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #1E2A42",
            borderTop: "3px solid #C4B5FD",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: 16, fontSize: 14, color: "#94A3B8" }}>
          Loading dashboard data from Google Drive...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0B0F1A",
          color: "#E2E8F0",
          fontFamily: "system-ui, sans-serif",
          padding: 40,
        }}
      >
        <div
          style={{
            background: "#131825",
            border: "1px solid #EF4444",
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            width: "100%",
          }}
        >
          <h2
            style={{ fontSize: 18, color: "#EF4444", margin: "0 0 12px" }}
          >
            Connection Error
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#94A3B8",
              lineHeight: 1.6,
              margin: "0 0 16px",
            }}
          >
            {error}
          </p>
          <p style={{ fontSize: 11, color: "#64748B", margin: 0 }}>
            Check your .env.local file and ensure Google Drive service account
            has read access to the folders.
          </p>
          <button
            onClick={fetchData}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#C4B5FD",
              color: "#0B0F1A",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard data={data} />;
}
