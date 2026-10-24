#!/usr/bin/env python3
"""One-off codemod: swap hardcoded SCSS colours for semantic theme tokens."""
import io
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'sass', 'components')

# (old, new) applied to every component file
GLOBAL = [
    ('background: #262829;', 'background: var(--surface-overlay);'),
    ('background-color: #262829;', 'background-color: var(--surface-overlay);'),
    ('background-color: #232425;', 'background-color: var(--surface-overlay);'),
    ('background: #232425;', 'background: var(--surface-overlay);'),
    ('background-color: #3E3E3E;', 'background-color: var(--surface-placeholder);'),
    ('background: #3E3E3E;', 'background: var(--surface-placeholder);'),
    ('background-color: #353535;', 'background-color: var(--surface-focus-row);'),
    ('background: #353535;', 'background: var(--surface-focus-row);'),

    ('background-color: rgba(0,0,0,0.9);', 'background-color: var(--surface-media-strong);'),
    ('background-color: rgba(0,0,0,0.5);', 'background-color: var(--surface-media);'),
    ('background: rgba(0,0,0,0.5);', 'background: var(--surface-media);'),
    ('background-color: rgba(0,0,0,0.4);', 'background-color: var(--surface-media);'),
    ('background: rgba(0,0,0,0.4);', 'background: var(--surface-media);'),
    ('background-color: rgba(0,0,0,0.3);', 'background-color: var(--surface-media);'),
    ('background: rgba(0,0,0,0.3);', 'background: var(--surface-media);'),
    ('background: rgba(0,0,0,0.15);', 'background: var(--surface-media);'),
    ('background-color: rgba(0,0,0,0.15);', 'background-color: var(--surface-media);'),

    ('background-color: rgba(255,255,255,0.35);', 'background-color: var(--surface-selected);'),
    ('background-color: rgba(255,255,255,0.3);', 'background-color: var(--surface-media);'),
    ('background: rgba(255,255,255,0.3);', 'background: var(--surface-media);'),
    ('background-color: rgba(255,255,255,0.2);', 'background-color: var(--surface-active);'),
    ('background-color: rgba(255,255,255,0.1);', 'background-color: var(--surface-hover);'),
    ('background: rgba(255,255,255,0.1);', 'background: var(--surface-hover);'),
    ('background-color: rgba(255,255,255,0.01);', 'background-color: var(--surface-hover);'),

    ('border: 0.3em solid #fff;', 'border: 0.3em solid var(--focus-ring-color);'),
    ('border: 0.2em dashed rgba(255,255,255,0.2);', 'border: 0.2em dashed var(--border-media);'),
    ('border: 1px solid #fff;', 'border: 1px solid var(--border-media);'),
]

# per-file replacements: file -> [(old, new), ...]
FILES = {
    'card_watched.scss': [
        ('color: #fff;', 'color: var(--text-media);'),
        ('color: #9f9f9f;', 'color: var(--text-media-muted);'),
        ('color: #6c6c6c;', 'color: rgba(255,255,255,0.55);'),
        ('color: #5e5e5e;', 'color: rgba(255,255,255,0.45);'),
        ('color: #4c4c4c;', 'color: rgba(255,255,255,0.35);'),
    ],
    'navigation-tabs.scss': [
        ('background: #e75454;', 'background: var(--danger);'),
        ('color: #fff;', 'color: var(--on-danger);'),
        ('background-color: #fff;', 'background-color: var(--focus-fill);'),
        ('color: #000;', 'color: var(--focus-fill-text);'),
    ],
    'helper.scss': [
        ('background: #4b8dcb;', 'background: var(--info);'),
        ('color: #fff;', 'color: var(--on-info);'),
        ('background-color: #fff;', 'background-color: var(--focus-fill);'),
    ],
    'activitys.scss': [
        ('background-color: rgba(255,255,255,0.5);', 'background-color: var(--text-media-muted);'),
    ],
    'full/start_new.scss': [
        ('color: rgba(255, 255, 255, 0.6);', 'color: var(--text-media-muted);'),
        ('color: #fff;', 'color: var(--text-media);'),
    ],
    'full/start.scss': [
        ('box-shadow: 0 0 0 0.4em #fff;', 'box-shadow: 0 0 0 0.4em var(--focus-ring-color);'),
        ('background: #ffe216;', 'background: var(--warning);'),
        ('color: #000;', 'color: var(--on-warning);'),
        ('background-color: #fff;', 'background-color: var(--focus-fill);'),
    ],
    'full/persons.scss': [
        ('background-color: #fff;', 'background-color: var(--focus-fill);'),
        ('color: #000;', 'color: var(--focus-fill-text);'),
    ],
    'full/descr.scss': [
        ('background-color: #fff;', 'background-color: var(--focus-fill);'),
        ('color: #000;', 'color: var(--focus-fill-text);'),
    ],
    'full/reviews.scss': [
        ('background: #494949;', 'background: var(--surface-raised-2);'),
        ('background-color: #fff;', 'background-color: var(--focus-fill);'),
        ('color: #000;', 'color: var(--focus-fill-text);'),
        ('border: dashed 2px #ddd;', 'border: dashed 2px var(--border-strong);'),
    ],
    'warning.scss': [
        ('background: rgba(0,0,0,0.5);', 'background: var(--surface-media-strong);'),
        ('color: #FF6A56;', 'color: var(--danger-text);'),
        ('background-color: rgba(255,255,255);', 'background-color: var(--focus-fill);'),
        ('color: #000;', 'color: var(--focus-fill-text);'),
    ],
    'noty.scss': [
        ('background: #65eaa7;', 'background: var(--success);'),
        ('color: #000;', 'color: var(--on-success);'),
        ('background: rgba(255, 255, 255, 0.2);', 'background: var(--surface-active);'),
        ('color: #fff;', 'color: var(--text-primary);'),
    ],
    'cub_premium.scss': [
        ('color: #d8c39a;', 'color: var(--warning-text);'),
        ('background-color: #D8C39A;', 'background-color: var(--warning);'),
        ('color: #000;', 'color: var(--on-warning);'),
        ('color: #D8C39A;', 'color: var(--warning-text);'),
    ],
    'tag_count.scss': [
        ('background-color: #fff;', 'background-color: var(--focus-fill);'),
        ('color: #000;', 'color: var(--focus-fill-text);'),
    ],
    'discuss_rules.scss': [
        ('color: #fff;', 'color: var(--text-primary);'),
        ('color: rgba(255, 87, 87, 1.0);', 'color: var(--danger-text);'),
    ],
    'feed.scss': [
        ('background: rgb(255,255,255,0.15);', 'background: var(--surface-selected);'),
    ],
    'account.scss': [
        ('color: #D8C39A;', 'color: var(--warning-text);'),
        ('background: #fff;', 'background: var(--focus-fill);'),
        ('background: rgb(60, 62, 63);', 'background: var(--surface-raised);'),
        ('background: #ffffff0f;', 'background: var(--surface-hover);'),
        ('background-color: #ddd;', 'background-color: var(--border-strong);'),
    ],
    'extensions.scss': [
        ('background-color: #404040;', 'background-color: var(--surface-raised-2);'),
    ],
    'explorer.scss': [
        ('background-color: rgba(0,0,0,0.07);', 'background-color: var(--surface-hover);'),
    ],
}


def apply(path, pairs):
    with io.open(path, encoding='utf-8') as fh:
        text = fh.read()

    original = text

    for old, new in pairs:
        text = text.replace(old, new)

    if text != original:
        with io.open(path, 'w', encoding='utf-8') as fh:
            fh.write(text)
        return True

    return False


def main():
    changed = []

    for dirpath, _dirnames, filenames in os.walk(ROOT):
        for name in sorted(filenames):
            if not name.endswith('.scss'):
                continue

            path = os.path.join(dirpath, name)

            pairs = list(GLOBAL) + FILES.get(name, [])

            if apply(path, pairs):
                changed.append(os.path.relpath(path, ROOT))

    print('updated: ' + ', '.join(changed) if changed else 'nothing changed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
