import { Terminal } from './components/Terminal';
import './styles/terminal.css';

function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1e1e2e',
      overflow: 'hidden',
    }}>
      <Terminal />
    </div>
  );
}

export default App;

