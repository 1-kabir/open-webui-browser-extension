export type BrowserKind = 'chromium' | 'firefox' | 'other'
export type ConnectionType = 'remote' | 'local'
export type ContextKind =
  | 'page'
  | 'selection'
  | 'tabs'
  | 'tab-groups'
  | 'clipboard'
  | 'screenshot'
  | 'html'
export interface Connection {
  id: string
  name: string
  url: string
  type: ConnectionType
  createdAt: number
  updatedAt: number
}
export interface Settings {
  connections: Connection[]
  defaultConnectionId: string | null
  theme: 'system' | 'light' | 'dark'
}
export interface CapabilityReport {
  browser: BrowserKind
  sidePanel: boolean
  sidebar: boolean
  tabs: boolean
  tabGroups: boolean
  clipboard: boolean
  capture: boolean
  fullPageCapture: boolean
}
export interface ContextItem {
  id: string
  kind: ContextKind
  title: string
  sourceUrl?: string
  text?: string
  dataUrl?: string
  createdAt: number
  pinned: boolean
  truncated: boolean
}
export interface ProtocolMessage {
  version: 1
  id: string
  type: string
  connectionId?: string
  payload?: unknown
}
