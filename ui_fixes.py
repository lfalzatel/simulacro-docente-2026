import re

with open('style.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace .profile-button
pattern_btn = re.compile(r'\.profile-button \{.*?\}\s*\.profile-button img \{.*?\}\s*\.profile-button:hover \{.*?\}', re.DOTALL)
replacement_btn = """.profile-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    border: 1px solid var(--glass-border);
    border-radius: var(--r-full);
    padding: 0.3rem 0.7rem 0.3rem 0.3rem;
    cursor: pointer;
    transition: all 0.2s var(--ease-smooth);
}

.profile-button:hover {
    background: var(--glass-bg-strong);
    border-color: var(--accent-primary);
}

.profile-avatar {
    position: relative;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
}

.profile-button img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-first-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.profile-chevron {
    font-size: 0.65rem;
    color: var(--text-secondary);
}"""

content = pattern_btn.sub(replacement_btn, content)

# Replace .bottom-nav
pattern_nav = re.compile(r'\.bottom-nav \{.*?\}', re.DOTALL)
replacement_nav = """.bottom-nav {
    position: fixed;
    bottom: calc(16px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0.5rem 0.6rem;
    z-index: 100;
    border-radius: 28px;
    background: var(--glass-bg-strong);
    backdrop-filter: blur(20px) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturate));
    border: 1px solid var(--glass-border);
    box-shadow: 0 20px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25);
}"""

content = pattern_nav.sub(replacement_nav, content)

# Replace .nav-item.active
pattern_active = re.compile(r'\.nav-item\.active \{.*?\}', re.DOTALL)
replacement_active = """.nav-item.active {
    color: var(--text-inverse);
    background: var(--accent-primary);
    animation: push-settle 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes push-settle {
    0%   { transform: scale(1); }
    40%  { transform: scale(0.85); }
    100% { transform: scale(1.05); }
}"""

content = pattern_active.sub(replacement_active, content)

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(content)
