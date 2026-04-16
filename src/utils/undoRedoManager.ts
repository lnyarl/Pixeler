const MAX_SNAPSHOTS = 50;

export interface Snapshot {
  imageData: ImageData;
  activeItemId: string | null;
}

export class UndoRedoManager {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];

  /** 현재 상태를 스냅샷으로 저장 (동작 시작 전에 호출) */
  pushSnapshot(imageData: ImageData, activeItemId: string | null) {
    const copy: Snapshot = {
      imageData: new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ),
      activeItemId,
    };
    this.undoStack.push(copy);

    if (this.undoStack.length > MAX_SNAPSHOTS) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  /** undo: 이전 상태 반환. 현재 상태를 redo 스택에 저장. */
  undo(currentImageData: ImageData, currentActiveItemId: string | null): Snapshot | null {
    if (this.undoStack.length === 0) return null;

    const currentCopy: Snapshot = {
      imageData: new ImageData(
        new Uint8ClampedArray(currentImageData.data),
        currentImageData.width,
        currentImageData.height
      ),
      activeItemId: currentActiveItemId,
    };
    this.redoStack.push(currentCopy);

    return this.undoStack.pop()!;
  }

  /** redo: 되돌린 상태 반환. 현재 상태를 undo 스택에 저장. */
  redo(currentImageData: ImageData, currentActiveItemId: string | null): Snapshot | null {
    if (this.redoStack.length === 0) return null;

    const currentCopy: Snapshot = {
      imageData: new ImageData(
        new Uint8ClampedArray(currentImageData.data),
        currentImageData.width,
        currentImageData.height
      ),
      activeItemId: currentActiveItemId,
    };
    this.undoStack.push(currentCopy);

    return this.redoStack.pop()!;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get undoCount() {
    return this.undoStack.length;
  }

  get redoCount() {
    return this.redoStack.length;
  }
}
