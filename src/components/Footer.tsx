interface Props {
  total: number;
  onClearCompleted: () => void;
}

export function Footer({ total, onClearCompleted }: Props) {
  return (
    <footer>
      <span>{total} task{total !== 1 ? 's' : ''} total</span>
      <button className="clear-done-btn" onClick={onClearCompleted}>
        Clear completed
      </button>
    </footer>
  );
}
