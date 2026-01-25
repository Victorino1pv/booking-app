import React from 'react';

export class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Global Error Caught:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#c00' }}>
                    <h1>Application Crashed</h1>
                    <p>Something went wrong in Production.</p>
                    <div style={{ background: '#eee', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
                        <strong>Error:</strong> {this.state.error?.toString()}
                    </div>
                    {this.state.errorInfo && (
                        <div style={{ marginTop: '1rem', fontSize: '0.8em', color: '#666' }}>
                            <pre>{this.state.errorInfo.componentStack}</pre>
                        </div>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
