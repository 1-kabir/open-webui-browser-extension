import { mount } from 'svelte'
import App from '../sidepanel/App.svelte'
import '../ui.css'

mount(App, { target: document.getElementById('app')! })
