import type { ReactNode } from 'react';

export interface A2UIComponent {
  id: string;
  component: string;
  parentId?: string;
  [key: string]: unknown;
}

export interface A2UIMessage {
  version: string;
  createSurface?: { surfaceId: string };
  updateComponents?: { surfaceId: string; components: A2UIComponent[] };
  updateDataModel?: { surfaceId: string; path: string; value: unknown };
  beginRendering?: { surfaceId: string };
}

export interface A2UIAction {
  type: string;
  payload?: Record<string, unknown>;
}

export interface ComponentRenderer {
  (props: {
    component: A2UIComponent;
    children: ReactNode;
    onAction: (action: A2UIAction) => void;
  }): ReactNode;
}

export interface A2UICatalog {
  renderers: Record<string, ComponentRenderer>;
}

export interface A2UIPanelProps {
  payload: A2UIMessage[] | null;
  loading?: boolean;
  error?: string | null;
  onAction?: (action: A2UIAction) => void;
  onFallback?: () => void;
  className?: string;
}
