import { useMemo } from 'react';
import type { A2UICatalog, A2UIComponent, A2UIMessage } from '../catalog/types';

export interface TreeNode {
  component: A2UIComponent;
  children: TreeNode[];
}

interface UseA2UIResult {
  tree: TreeNode[] | null;
  error: string | null;
  ready: boolean;
}

export function useA2UI(
  messages: A2UIMessage[] | null,
  _catalog: A2UICatalog
): UseA2UIResult {
  return useMemo(() => {
    if (!messages || messages.length === 0) {
      return { tree: null, error: null, ready: false };
    }

    try {
      // Collect all components from updateComponents messages
      const componentMap = new Map<string, A2UIComponent>();

      for (const msg of messages) {
        if (msg.updateComponents) {
          for (const comp of msg.updateComponents.components) {
            componentMap.set(comp.id, comp);
          }
        }
      }

      if (componentMap.size === 0) {
        return { tree: null, error: null, ready: false };
      }

      // Build tree from flat adjacency list
      const roots: TreeNode[] = [];

      // First pass: create TreeNode for each component
      const nodeMap = new Map<string, TreeNode>();
      for (const comp of componentMap.values()) {
        nodeMap.set(comp.id, { component: comp, children: [] });
      }

      // Second pass: link children to parents
      for (const comp of componentMap.values()) {
        const node = nodeMap.get(comp.id)!;
        if (comp.parentId && nodeMap.has(comp.parentId)) {
          const parent = nodeMap.get(comp.parentId)!;
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }

      return { tree: roots, error: null, ready: true };
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to process A2UI messages';
      return { tree: null, error: errorMessage, ready: false };
    }
  }, [messages]);
}
