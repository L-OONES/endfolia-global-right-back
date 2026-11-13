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
        label: '右键返回方式',
        settings: [{
            key: 'mode', type: 'select', label: '右键返回方式', defaultValue: 'jingxie',
            options: (directBack ? modes : modes.slice(0, 1)).map(({ value, label }) => ({ value, label })),
        }],
        settingsPanel(container, { settings }) {
            const buttons = modes.map(({ value, label, description }) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:.65em;margin:.35em 0';
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.disabled = value === 'fanfu' && !directBack;
                button.style.cssText = 'font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px;padding:.25em .65em';
                if (button.disabled) button.style.opacity = '.45';
                const help = document.createElement('span');
                help.textContent = description;
                button.addEventListener('click', () => settings.set({ mode: value }));
                row.append(button, help);
                container.append(row);
                return { value, button };
            });
            function sync() {
                for (const { value, button } of buttons) {
                    const selected = settings.get().mode === value;
                    button.setAttribute('aria-pressed', String(selected));
                    button.style.fontWeight = selected ? 'bold' : 'normal';
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
