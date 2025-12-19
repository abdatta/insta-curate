import { render } from 'preact';
import { App } from './app';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

render(<App />, document.getElementById('app') as HTMLElement);
