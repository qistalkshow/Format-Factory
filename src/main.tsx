import { render } from 'preact';
import { App } from './app/App';
import './app/styles.css';
import './app/accessibility.css';

const root = document.getElementById('app')!;
// Preact 不會自動移除非其建立的啟動提示；載入成功後才清除。
root.replaceChildren();
render(<App />, root);
