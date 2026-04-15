import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      info: null,
      globalError: null
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleWindowError = (event) => {
    this.setState({
      globalError: {
        message: event.message || "Unknown window error",
        stack: event.error?.stack || ""
      }
    });
  };

  handleUnhandledRejection = (event) => {
    const reason = event.reason;
    this.setState({
      globalError: {
        message: reason?.message || String(reason || "Unhandled promise rejection"),
        stack: reason?.stack || ""
      }
    });
  };

  render() {
    const { error, info, globalError } = this.state;
    if (error || globalError) {
      const activeError = globalError || error;
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", color: "#111827", background: "#f8fafc", minHeight: "100vh" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <h1 style={{ margin: "0 0 12px", fontSize: 24 }}>页面运行出错</h1>
            <p style={{ margin: "0 0 16px", color: "#4b5563" }}>已捕获到前端运行时异常，下面是具体错误信息。</p>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#111827", color: "#f9fafb", padding: 16, borderRadius: 8, overflow: "auto" }}>
              {activeError?.message || "Unknown error"}
              {activeError?.stack ? `\n\n${activeError.stack}` : ""}
              {info?.componentStack ? `\n\nComponent stack:\n${info.componentStack}` : ""}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function BootLoader() {
  const [AppComponent, setAppComponent] = React.useState(null);
  const [bootError, setBootError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    import("./App")
      .then((module) => {
        if (!cancelled) {
          setAppComponent(() => module.default);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setBootError(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (bootError) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", color: "#111827", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 24 }}>应用加载失败</h1>
          <p style={{ margin: "0 0 16px", color: "#4b5563" }}>已捕获到 `App` 模块加载异常，下面是具体错误信息。</p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#111827", color: "#f9fafb", padding: 16, borderRadius: 8, overflow: "auto" }}>
            {bootError?.message || "Unknown boot error"}
            {bootError?.stack ? `\n\n${bootError.stack}` : ""}
          </pre>
        </div>
      </div>
    );
  }

  if (!AppComponent) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", color: "#111827", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", background: "#ffffff", border: "1px solid #e5eeb", borderRadius: 12, padding: 20 }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 24 }}>应用加载中</h1>
          <p style={{ margin: 0, color: "#4b5563" }}>正在初始化前端模块，请稍候…</p>
        </div>
      </div>
    );
  }

  return <AppComponent />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <BootLoader />
    </RootErrorBoundary>
  </React.StrictMode>
);
