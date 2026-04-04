// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

'use strict';

// Tab navigation for preview page (no auth required)
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tab = link.dataset.tab;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            const section = document.getElementById(`${tab}-tab`);
            if (section) section.classList.add('active');
        });
    });
});
