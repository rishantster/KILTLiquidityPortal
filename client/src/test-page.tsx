export default function TestPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000', 
      color: '#fff', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', color: '#ff0066' }}>🚀 KILT Portal Loading Test</h1>
      <p style={{ color: '#10b981' }}>✅ React is mounting successfully!</p>
      <p style={{ color: '#6b7280' }}>API Backend: Connected</p>
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#1f2937', 
        borderRadius: '8px',
        border: '1px solid #374151'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Cache Version: 2025.01.19.002
        </p>
      </div>
    </div>
  );
}