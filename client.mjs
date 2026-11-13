const modes = [
    { value: 'jingxie', label: '靖歇', description: '海报展开或磁贴有焦点时先清掉状态，再次右键才回退上级' },
    { value: 'fanfu', label: '翻覆', description: '一次右键回退上级' },
];

export function activateWithModes(folium, directBack) {
    if (folium.env.context !== 'main') return;

    const ui = folium.ui;
    if (typeof ui?.back !== 'function') return;

    const section = folium.registries.settingsSections.register({
        id: 'back',
        label: { 'zh-CN': '右键返回方式', en: 'Right-click back mode' },
        settings: [{
            key: 'mode', type: 'select', label: { 'zh-CN': '右键返回方式', en: 'Right-click back mode' },
            defaultValue: 'jingxie',
            options: (directBack ? modes : modes.slice(0, 1)).map(({ value, label }) => ({ value, label: { 'zh-CN': label } })),
        }],
        settingsPanel(container, { settings }) {
            const style = document.createElement('style');
            style.textContent = `
                .back-mode { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-weight: 400; }
                .back-mode button {
                    min-width: 48px; height: 24px; padding: 0 6px; border: 0;
                    border-radius: 6px; font: 400 12px var(--folium-font, sans-serif);
                    color: var(--folium-secondary, inherit);
                    background: color-mix(in srgb, currentColor 9%, transparent);
                    cursor: pointer;
                }
                .back-mode button:enabled:hover { background: color-mix(in srgb, currentColor 16%, transparent); }
                .back-mode button:focus-visible { outline: 2px solid var(--folium-accent, currentColor); outline-offset: 2px; }
                .back-mode button[aria-pressed="true"] {
                    color: var(--folium-primary, inherit);
                    background: color-mix(in srgb, var(--folium-accent, currentColor) 19%, transparent);
                    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--folium-accent, currentColor) 72%, transparent);
                }
                .back-mode button[aria-pressed="true"]::before { content: '✓ '; }
                .back-mode button:disabled { opacity: .45; cursor: default; }
                .back-mode span { font-size: 12px; color: var(--folium-secondary, inherit); }
            `;
            container.append(style);
            const buttons = modes.map(({ value, label, description }) => {
                const row = document.createElement('div');
                row.className = 'back-mode';
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.disabled = value === 'fanfu' && !directBack;
                const help = document.createElement('span');
                help.textContent = button.disabled ? '未开放' : description;
                button.addEventListener('click', () => settings.set({ mode: value }));
                row.append(button, help);
                container.append(row);
                return { value, button };
            });
            function sync() {
                for (const { value, button } of buttons) {
                    const selected = settings.get().mode === value;
                    button.setAttribute('aria-pressed', String(selected));
                }
            }
            sync();
            return settings.onChange(sync);
        },
    });

    let handledPress = false;
    const onPointerDown = event => {
        handledPress = false;
        if (event.defaultPrevented || event.button !== 2
            || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

        // Decide before Folia's click-outside handlers can change the top layer.
        handledPress = (section.settings.get().mode === 'fanfu' && directBack?.()) || ui.back();
        if (!handledPress) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    const onContextMenu = event => {
        const suppressMenu = handledPress && event.button === 2;
        handledPress = false;
        if (!suppressMenu) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    };

    const options = { capture: true };
    window.addEventListener('pointerdown', onPointerDown, options);
    window.addEventListener('contextmenu', onContextMenu, options);
    return () => {
        window.removeEventListener('pointerdown', onPointerDown, options);
        window.removeEventListener('contextmenu', onContextMenu, options);
        section.unregister();
    };
}

export default function activate(folium) {
    return activateWithModes(folium);
}
