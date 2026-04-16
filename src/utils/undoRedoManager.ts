const MAX_SNAPSHOTS = 50;

export class UndoRedoManager {
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];

  /** 현재 상태를 스냅샷으로 저장 (그리기 동작 시작 전에 호출) */
  pushSnapshot(imageData: ImageData) {
    const copy = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    this.undoStack.push(copy);

    if (this.undoStack.length > MAX_SNAPSHOTS) {
      this.undoStack.shift();
    }

    // 새 동작 수행 시 redo 스택 클리어
    this.redoStack = [];
  }

  /** undo: 이전 상태 반환. 현재 상태를 redo 스택에 저장. */
  undo(currentImageData: ImageData): ImageData | null {
    if (this.undoStack.length === 0) return null;

    const currentCopy = new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    );
    this.redoStack.push(currentCopy);

    return this.undoStack.pop()!;
  }

  /** redo: 되돌린 상태 반환. 현재 상태를 undo 스택에 저장. */
  redo(currentImageData: ImageData): ImageData | null {
    if (this.redoStack.length === 0) return null;

    const currentCopy = new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    );
    this.undoStack.push(currentCopy);

    return this.redoStack.pop()!;
  }

  /** 스택 초기화 (해상도 변경 시) */
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
