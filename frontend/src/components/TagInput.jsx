import { useState } from 'react';
import './components.css';

const SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'SQL', 'Python',
  'Java', 'C++', 'C#', 'Go', 'Flutter', 'Kotlin', 'Swift', 'HTML', 'CSS', 'Tailwind',
  'Django', 'Machine Learning', 'Data Science', 'UI/UX Design', 'Figma', 'DevOps',
  'Docker', 'AWS', 'Git', 'Cybersecurity', 'Blockchain', 'Android', 'iOS',
];

// Type a skill and press Enter (or comma) to add it as a tag; click × to remove one
function TagInput({ value, onChange, placeholder = 'Add a skill and press Enter', listId }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const tag = raw.trim().replace(/,$/, '').trim();
    if (!tag) return;
    if (!value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag].slice(0, 25));
    }
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        list={listId}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => {
          // Picking a suggestion from the list adds it straight away
          if (SUGGESTIONS.includes(e.target.value)) add(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => add(draft)}
      />
      <datalist id={listId}>
        {SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

export default TagInput;
