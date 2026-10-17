import { Component, type ComponentChildren } from 'preact';
import type { Messages } from '@/i18n';
// 僅攔截呈現錯誤；非同步工作仍由各模組處理，不持久化錯誤或文件資料。
export class ToolBoundary extends Component<
  {
    t: Messages;
    onReset(): void;
    children: ComponentChildren;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div class="panel" role="alert">
        <p>{this.props.t.unexpected}</p>
        <button onClick={this.props.onReset}>{this.props.t.reset}</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
