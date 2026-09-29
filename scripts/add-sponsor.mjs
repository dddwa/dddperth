#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs/promises'
import http from 'http'
import os from 'os'
import path from 'path'
import url from 'url'
import { processLogo } from './lib/process-logo.mjs'
import {
    fetchPortalSubmissions,
    getAvailableYears,
    getSponsorsByYear,
    PORTAL_ENVS,
    print,
    processPortalLogo,
    readYearConfig,
    saveSponsor,
    SPONSORS_DIR,
    updateSponsorLogoInConfig,
    yearConfigRelPath,
} from './lib/sponsor-ops.mjs'
import { SPONSOR_TIERS, tierLabel } from './lib/sponsor-tiers.mjs'

const config = {
    // Overridable so a second checkout can run its own UI alongside another.
    port: Number(process.env.SPONSOR_UI_PORT) || 3802,
    appName: 'DDD Perth Sponsor Management',
}

// Simple multipart parser for file uploads
function parseMultipart(data, boundary) {
    const parts = {}
    const files = {}
    const sections = data.split(`--${boundary}`)

    for (const section of sections) {
        if (section.includes('Content-Disposition')) {
            // Split headers from content
            const headerEndIndex = section.indexOf('\r\n\r\n')
            if (headerEndIndex === -1) continue

            const headers = section.slice(0, headerEndIndex)
            const content = section.slice(headerEndIndex + 4)

            // Parse Content-Disposition header
            const headerMatch = headers.match(
                /Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/,
            )
            if (headerMatch) {
                const fieldName = headerMatch[1]
                const filename = headerMatch[2]

                // Clean content (remove trailing boundary markers and line endings)
                let cleanContent = content.replace(/\r\n$/, '').replace(/\r\n--$/, '')

                if (filename) {
                    files[fieldName] = {
                        filename,
                        data: Buffer.from(cleanContent, 'binary'),
                    }
                } else {
                    // The body is split as 'binary' so file bytes survive; text
                    // fields are UTF-8 and must be decoded back, or ’ and — in
                    // sponsor quotes land in the config as mojibake.
                    parts[fieldName] = Buffer.from(cleanContent, 'binary').toString('utf-8')
                }
            }
        }
    }

    return { parts, files }
}

// HTML template for the UI
function getHTML(years) {
    const yearOptions = years.map((year) => `<option value="${year}">${year}</option>`).join('\n                ')
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.appName}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .form-section { background: #f9f9f9; padding: 20px; border-radius: 6px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; color: #555; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        textarea { height: 80px; resize: vertical; }
        .upload-area { border: 2px dashed #ddd; border-radius: 6px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
        .upload-area:hover { border-color: #007cba; background: #f0f8ff; }
        .upload-area.dragover { border-color: #007cba; background: #e6f3ff; }
        .preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px; }
        .preview-item { text-align: center; background: #f9f9f9; padding: 15px; border-radius: 6px; }
        .preview-item img { max-width: 100%; max-height: 120px; object-fit: contain; border: 1px solid #eee; border-radius: 4px; }
        .preview-item h4 { margin: 10px 0 5px; color: #333; }
        .btn { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; transition: background 0.3s; }
        .btn:hover { background: #005a87; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .error { background: #ffe6e6; color: #cc0000; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .success { background: #e6ffe6; color: #006600; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .loading { text-align: center; padding: 20px; color: #666; }
        .year-selector { position: sticky; top: 20px; background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .sponsor-list { margin-top: 30px; }
        .tier-section { margin-bottom: 30px; }
        .tier-title { background: #333; color: white; padding: 10px 15px; margin: 0; border-radius: 4px 4px 0 0; }
        .sponsor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; background: #f9f9f9; padding: 20px; border-radius: 0 0 4px 4px; }
        .sponsor-card { background: white; padding: 15px; border-radius: 4px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .sponsor-logo { max-width: 100%; max-height: 60px; object-fit: contain; }
        .update-logo-btn {
            margin-top: 10px; padding: 6px 12px; background: #007cba; color: white; border: none;
            border-radius: 4px; cursor: pointer; font-size: 12px;
        }
        .update-logo-btn:hover { background: #005a87; }
        .tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab.active { border-bottom-color: #007cba; color: #007cba; font-weight: 500; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .search-results { position: relative; }
        .search-result { border: 1px solid #ddd; border-top: none; padding: 10px; cursor: pointer; background: white; display: flex; align-items: center; gap: 10px; }
        .search-result:hover { background: #f5f5f5; }
        .search-result:first-child { border-top: 1px solid #ddd; border-radius: 0 0 4px 4px; }
        .search-result .sponsor-logo-preview { width: 40px; height: 30px; object-fit: contain; border: 1px solid #eee; }
        .search-result .sponsor-info { flex: 1; }
        .search-result .sponsor-name { font-weight: 500; color: #333; }
        .search-result .sponsor-details { font-size: 12px; color: #666; margin-top: 2px; }
        .logo-preview-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: none; align-items: center; justify-content: center; }
        .logo-preview-content { background: white; padding: 30px; border-radius: 8px; max-width: 90%; max-height: 90%; overflow-y: auto; }
        .logo-variants-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .logo-variant { text-align: center; }
        .logo-variant img { max-width: 100%; max-height: 80px; object-fit: contain; border: 1px solid #eee; margin-bottom: 5px; }
        .modal-actions { text-align: center; margin-top: 20px; }
        .modal-actions button { margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 ${config.appName}</h1>

        <div class="year-selector">
            <label for="year">Conference Year:</label>
            <select id="year" onchange="loadSponsors()">
                ${yearOptions}
            </select>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="showTab('add')">Add Sponsor</div>
            <div class="tab" onclick="showTab('view')">View Sponsors</div>
            <div class="tab" onclick="showTab('portal')">Portal Import</div>
        </div>

        <div id="add-tab" class="tab-content active">
            <form id="sponsor-form" enctype="multipart/form-data">
                <div class="form-grid">
                    <div class="form-section">
                        <h3>Sponsor Details</h3>
                        <div class="form-group">
                            <label for="sponsor-search">Search Existing Sponsors (Optional)</label>
                            <input type="text" id="sponsor-search" placeholder="Type sponsor name to search previous years..." onkeyup="searchSponsors()" autocomplete="off">
                            <div id="sponsor-results" class="search-results"></div>
                        </div>
                        <div class="form-group">
                            <label for="name">Company Name *</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="website">Website URL</label>
                            <input type="url" id="website" name="website" placeholder="https://example.com">
                        </div>
                        <div class="form-group">
                            <label for="tier">Sponsorship Tier *</label>
                            <select id="tier" name="tier" required>
                                ${SPONSOR_TIERS.map(
                                    (tier) =>
                                        `<option value="${tier}"${tier === 'gold' ? ' selected' : ''}>${tierLabel(tier)}</option>`,
                                ).join('\n                                ')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="quote">Quote (Optional)</label>
                            <textarea id="quote" name="quote" placeholder="Optional sponsor statement"></textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Logo Upload</h3>
                        <div class="upload-area" onclick="document.getElementById('logo').click()">
                            <input type="file" id="logo" name="logo" accept="image/*" style="display: none" onchange="previewLogo()">
                            <p>Click to select logo file</p>
                            <p style="font-size: 12px; color: #666; margin-top: 10px;">SVG preferred, PNG acceptable</p>
                        </div>
                    </div>
                </div>

                <div id="preview-section" style="display: none;">
                    <h3>Logo Preview - All Variants</h3>
                    <div id="preview-grid" class="preview-grid"></div>
                    <div style="margin-top: 20px;">
                        <button type="button" class="btn" onclick="processAndSave()" id="save-btn" disabled>
                            ✅ Approve & Save Sponsor
                        </button>
                    </div>
                </div>
            </form>
        </div>

        <div id="view-tab" class="tab-content">
            <div id="sponsor-list" class="sponsor-list">
                <div class="loading">Loading sponsors...</div>
            </div>
        </div>

        <div id="portal-tab" class="tab-content">
            <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                Pull sponsor submissions from the deployed sponsor portal (remote D1/R2 via wrangler —
                you need to be logged in with <code>wrangler login</code>). Importing pre-fills the Add
                Sponsor form and processes the uploaded logo; review then Approve &amp; Save as usual.
                Saving a portal import also attaches the processed light/dark logo variants to the
                sponsor's Jira issue (uses the credentials saved by <code>pnpm jira:auth</code>).
            </p>
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px;">
                <label for="portal-env" style="font-weight: 500;">Environment</label>
                <select id="portal-env">
                    <option value="production">production</option>
                    <option value="staging">staging</option>
                    <option value="local">local (dev server)</option>
                </select>
                <button type="button" class="btn" onclick="loadPortalSubmissions()" id="portal-fetch-btn">Fetch submissions</button>
            </div>
            <div id="portal-list"></div>
        </div>
    </div>

    <!-- Logo Preview Modal -->
    <div id="logo-preview-modal" class="logo-preview-modal">
        <div class="logo-preview-content">
            <h3 id="modal-sponsor-name">Sponsor Logo Variants</h3>
            <div id="logo-variants-grid" class="logo-variants-grid"></div>
            <div class="modal-actions">
                <button class="btn" onclick="useExistingLogos()">✅ Use Existing Logos</button>
                <button class="btn" onclick="needNewLogos()" style="background: orange;">🔄 Need New Logos</button>
                <button onclick="closeLogoModal()" style="background: #666;">❌ Cancel</button>
            </div>
        </div>
    </div>

    <script>
        let currentPreviews = null;
        let searchTimeout = null;

        function showTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            // Find and activate the clicked tab
            document.querySelectorAll('.tab').forEach(t => {
                if (t.textContent.toLowerCase().includes(tab)) {
                    t.classList.add('active');
                }
            });

            document.getElementById(tab + '-tab').classList.add('active');

            if (tab === 'view') {
                loadSponsors();
            }
        }

        async function previewLogo() {
            const fileInput = document.getElementById('logo');
            const file = fileInput.files[0];

            if (!file) return;

            const formData = new FormData();
            formData.append('logo', file);

            try {
                const response = await fetch('/api/process-logo', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    currentPreviews = result;
                    displayPreview(result);
                } else {
                    alert('Error processing logo: ' + result.error);
                }
            } catch (error) {
                alert('Error processing logo: ' + error.message);
            }
        }

        function displayPreview(previews) {
            const previewSection = document.getElementById('preview-section');
            const previewGrid = document.getElementById('preview-grid');
            const saveBtn = document.getElementById('save-btn');

            updatePreviewDisplay(previews);

            previewSection.style.display = 'block';
            saveBtn.disabled = false;
        }

        function updatePreviewDisplay(previews) {
            const previewGrid = document.getElementById('preview-grid');

            previewGrid.innerHTML =
                '<div class="preview-item">' +
                    '<img src="' + previews.original + '" alt="Original">' +
                    '<h4>Original</h4>' +
                '</div>' +
                '<div class="preview-item">' +
                    '<img src="' + previews.light + '" alt="Light Mode" style="background: #fff; padding: 10px; border: 1px solid #eee;">' +
                    '<h4>Light Mode</h4>' +
                    '<p style="font-size: 12px; color: #666; margin-top: 5px;">For light backgrounds</p>' +
                '</div>' +
                '<div class="preview-item">' +
                    '<img src="' + previews.dark + '" alt="Dark Mode" style="background: #333; padding: 10px;">' +
                    '<h4>Dark Mode</h4>' +
                    '<p style="font-size: 12px; color: #666; margin-top: 5px;">For dark backgrounds</p>' +
                '</div>';
        }

        async function processAndSave() {
            const form = document.getElementById('sponsor-form');
            const formData = new FormData(form);
            const year = document.getElementById('year').value;

            // Add processed logo data if available
            if (currentPreviews) {
                formData.append('logoData', JSON.stringify(currentPreviews));
            }

            // Record portal-sourced saves for update tracking
            if (currentPortalImport) {
                formData.append('portalImport', JSON.stringify(currentPortalImport));
            }

            formData.append('year', year);

            try {
                const response = await fetch('/api/sponsors', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    let jiraSummary = '';
                    if (result.jira) {
                        if (result.jira.skipped) {
                            jiraSummary = '\\n\\nJira: attach skipped — ' + result.jira.skipped;
                        } else {
                            if (result.jira.attached && result.jira.attached.length > 0) {
                                jiraSummary = '\\n\\nJira: attached ' + result.jira.attached.join(', ');
                            }
                            if (result.jira.errors && result.jira.errors.length > 0) {
                                jiraSummary += '\\n\\nJira warnings:\\n' + result.jira.errors.join('\\n');
                            }
                        }
                    }
                    alert('Sponsor added successfully!' + jiraSummary + '\\n\\nNext steps:\\n1. Review the generated config in your terminal\\n2. Add it to the year config file\\n3. Commit the changes');
                    form.reset();
                    document.getElementById('preview-section').style.display = 'none';
                    document.getElementById('save-btn').disabled = true;
                    currentPreviews = null;
                    currentPortalImport = null;

                    // Clear search results and cache
                    document.getElementById('sponsor-search').value = '';
                    document.getElementById('sponsor-results').innerHTML = '';
                    if (searchTimeout) {
                        clearTimeout(searchTimeout);
                    }

                    // Switch to view tab to see the results
                    showTab('view');
                } else {
                    alert('Error saving sponsor: ' + result.error);
                }
            } catch (error) {
                alert('Error saving sponsor: ' + error.message);
            }
        }

        let portalSubmissions = [];
        // The portal submission behind the current Add Sponsor form, if any.
        // Attached to Approve & Save so the import is recorded for update
        // tracking; cleared whenever the form is filled from anywhere else.
        let currentPortalImport = null;

        async function loadPortalSubmissions() {
            const env = document.getElementById('portal-env').value;
            const listDiv = document.getElementById('portal-list');
            const fetchBtn = document.getElementById('portal-fetch-btn');

            fetchBtn.disabled = true;
            listDiv.innerHTML = '<div class="loading">Fetching from ' + env + ' (this shells out to wrangler, give it a few seconds)...</div>';

            try {
                const response = await fetch('/api/portal/submissions?env=' + env);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Fetch failed');

                portalSubmissions = data;
                if (data.length === 0) {
                    listDiv.innerHTML = '<p>No sponsors found in the ' + env + ' portal.</p>';
                    return;
                }

                let html = '<table style="width:100%; border-collapse: collapse; font-size: 14px;">' +
                    '<tr style="text-align:left; border-bottom: 1px solid #ddd;">' +
                    '<th style="padding:8px;">Sponsor</th><th>Status</th><th>Jira tier</th><th>Website</th><th>Blurb</th><th>Logo</th><th></th></tr>';
                data.forEach(function(sub, index) {
                    let statusHtml, buttonLabel;
                    if (sub.status === 'new') {
                        statusHtml = '<span style="background:#e6f3ff; color:#005a87; padding:2px 8px; border-radius:10px; font-size:12px;">🆕 New</span>';
                        buttonLabel = 'Import';
                    } else if (sub.status === 'updated') {
                        statusHtml = '<span style="background:#fff3cd; color:#856404; padding:2px 8px; border-radius:10px; font-size:12px;">🔄 Updated</span>' +
                            '<br><span style="color:#856404; font-size:11px;">' + sub.changes.map(escapeHtmlText).join(', ') + ' changed</span>';
                        buttonLabel = 'Review update';
                    } else {
                        statusHtml = '<span style="background:#e6ffe6; color:#006600; padding:2px 8px; border-radius:10px; font-size:12px;">✅ Imported</span>';
                        buttonLabel = 'Re-import';
                    }
                    html += '<tr style="border-bottom: 1px solid #eee;">' +
                        '<td style="padding:8px;"><strong>' + escapeHtmlText(sub.name) + '</strong><br><span style="color:#888; font-size:12px;">' + escapeHtmlText(sub.issueKey) + '</span></td>' +
                        '<td>' + statusHtml + '</td>' +
                        '<td>' + escapeHtmlText(sub.jiraTier || '') + (sub.suggestedTier ? '<br><span style="color:#888; font-size:12px;">→ ' + escapeHtmlText(sub.suggestedTier) + '</span>' : '') + '</td>' +
                        '<td>' + (sub.website ? '<a href="' + encodeURI(sub.website) + '" target="_blank">link</a>' : '—') + '</td>' +
                        '<td style="max-width: 260px;">' + escapeHtmlText((sub.quote || '').slice(0, 120)) + '</td>' +
                        '<td>' + (sub.logoR2Key ? '✅' : '—') + '</td>' +
                        '<td><button type="button" class="btn" onclick="importPortalSponsor(' + index + ')">' + buttonLabel + '</button></td>' +
                        '</tr>';
                });
                html += '</table>';
                listDiv.innerHTML = html;
            } catch (error) {
                listDiv.innerHTML = '<p style="color: #c00;">Error: ' + escapeHtmlText(error.message) + '</p>';
            } finally {
                fetchBtn.disabled = false;
            }
        }

        function escapeHtmlText(text) {
            const div = document.createElement('div');
            div.textContent = text == null ? '' : String(text);
            return div.innerHTML;
        }

        async function importPortalSponsor(index) {
            const sub = portalSubmissions[index];
            if (!sub) return;
            const env = document.getElementById('portal-env').value;

            // Remembered until Approve & Save so the import gets recorded in
            // the year's portal-imports sidecar (enables update detection).
            currentPortalImport = sub;

            // Pre-fill the Add Sponsor form from the submission
            document.getElementById('name').value = sub.name || '';
            document.getElementById('website').value = sub.website || '';
            document.getElementById('quote').value = sub.quote || '';
            const tierSelect = document.getElementById('tier');
            // Updates keep the tier the committee chose last time; new
            // imports start from the Jira tier mapping.
            const preferredTier = sub.importedTier || sub.suggestedTier;
            if (preferredTier && Array.from(tierSelect.options).some(function(o) { return o.value === preferredTier; })) {
                tierSelect.value = preferredTier;
            }

            showTab('add');

            if (sub.status === 'updated') {
                showNotification('Changed since last import: ' + sub.changes.join(', ') + '. Review and Approve & Save to update in place.', 'info');
            }

            if (!sub.logoR2Key) {
                showNotification('Imported details for ' + sub.name + ' — no logo uploaded yet, add one manually.', 'info');
                return;
            }

            if (sub.status === 'updated' && sub.changes.indexOf('logo') === -1) {
                // Logo unchanged: no download/reprocessing needed, existing
                // files stay. Enable saving so the detail changes can land.
                document.getElementById('preview-grid').innerHTML =
                    '<div class="preview-item"><h4>Logo unchanged</h4><p style="font-size:12px; color:#666;">Keeping the existing logo files — only details will update.</p></div>';
                document.getElementById('preview-section').style.display = 'block';
                document.getElementById('save-btn').disabled = false;
                showNotification('Logo unchanged since last import — details will update in place.', 'info');
                return;
            }

            showNotification('Downloading and processing ' + sub.name + ' logo from ' + env + '…', 'info');
            try {
                const response = await fetch('/api/portal/import-logo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ env: env, r2Key: sub.logoR2Key, filename: sub.logoFilename })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error || 'Logo processing failed');

                currentPreviews = result;
                displayPreview(result);
                showNotification('Logo processed — review the variants below, pick the tier, then Approve & Save.', 'info');
            } catch (error) {
                showNotification('Logo import failed: ' + error.message + ' — you can still save details and add a logo manually.', 'error');
            }
        }

        async function loadSponsors() {
            const year = document.getElementById('year').value;
            const sponsorList = document.getElementById('sponsor-list');

            sponsorList.innerHTML = '<div class="loading">Loading sponsors...</div>';

            try {
                const response = await fetch('/api/sponsors/' + year);
                const sponsors = await response.json();

                let html = '';

                for (const [tier, tierSponsors] of Object.entries(sponsors)) {
                    if (tierSponsors.length > 0) {
                        html +=
                            '<div class="tier-section">' +
                                '<h3 class="tier-title">' + tier.toUpperCase() + '</h3>' +
                                '<div class="sponsor-grid">';

                        for (const sponsor of tierSponsors) {
                            const logoUrl = sponsor.logoUrlLightMode || sponsor.logoUrlDarkMode || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiPk5vIExvZ288L3RleHQ+PC9zdmc+';
                            html +=
                                '<div class="sponsor-card">' +
                                    '<img src="' + logoUrl + '" alt="' + sponsor.name + '" class="sponsor-logo" onerror="this.style.display=\\\'none\\\'">' +
                                    '<h4>' + sponsor.name + '</h4>' +
                                    (sponsor.website ? '<a href="' + sponsor.website + '" target="_blank" style="font-size: 12px;">Visit Website</a>' : '') +
                                    '<button class="update-logo-btn" onclick="updateSponsorLogo(\\\'' + sponsor.name + '\\\', \\\'' + year + '\\\')">🔄 Update Logo</button>' +
                                '</div>';
                        }

                        html += '</div></div>';
                    }
                }

                if (html === '') {
                    html = '<div style="text-align: center; padding: 40px; color: #666;">No sponsors found for ' + year + '</div>';
                }

                sponsorList.innerHTML = html;

            } catch (error) {
                sponsorList.innerHTML = '<div class="error">Error loading sponsors: ' + error.message + '</div>';
            }
        }

        // Sponsor search functionality
        function searchSponsors() {
            const query = document.getElementById('sponsor-search').value;
            const currentYear = document.getElementById('year').value;
            const resultsDiv = document.getElementById('sponsor-results');

            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (query.length < 2) {
                resultsDiv.innerHTML = '';
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch('/api/sponsors/search?q=' + encodeURIComponent(query) + '&exclude=' + currentYear);
                    const results = await response.json();

                    if (results.length === 0) {
                        resultsDiv.innerHTML = '<div style="padding: 10px; color: #666; font-style: italic;">No sponsors found</div>';
                        return;
                    }

                    let html = '';
                    for (const sponsor of results) {
                        // Clean up sponsor data and handle undefined values
                        const cleanSponsor = {
                            name: sponsor.name || '',
                            website: sponsor.website || '',
                            logoUrlLightMode: (sponsor.logoUrlLightMode && sponsor.logoUrlLightMode !== 'undefined') ? sponsor.logoUrlLightMode : '',
                            logoUrlDarkMode: (sponsor.logoUrlDarkMode && sponsor.logoUrlDarkMode !== 'undefined') ? sponsor.logoUrlDarkMode : '',
                            quote: (sponsor.quote && sponsor.quote !== 'undefined') ? sponsor.quote : '',
                            year: sponsor.year || '',
                            tier: sponsor.tier || ''
                        };

                        const logoUrl = cleanSponsor.logoUrlLightMode || cleanSponsor.logoUrlDarkMode || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+Tm8gTG9nbzwvdGV4dD48L3N2Zz4=';
                        html +=
                            '<div class="search-result" onclick="previewSponsorLogos(' + JSON.stringify(cleanSponsor).replace(/"/g, '&quot;') + ')">' +
                                '<img src="' + logoUrl + '" alt="' + cleanSponsor.name + '" class="sponsor-logo-preview">' +
                                '<div class="sponsor-info">' +
                                    '<div class="sponsor-name">' + cleanSponsor.name + '</div>' +
                                    '<div class="sponsor-details">From ' + cleanSponsor.year + ' (' + cleanSponsor.tier.toUpperCase() + ' tier)</div>' +
                                '</div>' +
                            '</div>';
                    }

                    resultsDiv.innerHTML = html;
                } catch (error) {
                    console.error('Search error:', error);
                    resultsDiv.innerHTML = '<div style="padding: 10px; color: #cc0000;">Search failed</div>';
                }
            }, 300);
        }

        let selectedSponsor = null;

        function previewSponsorLogos(sponsor) {
            selectedSponsor = sponsor;
            const modal = document.getElementById('logo-preview-modal');
            const nameElement = document.getElementById('modal-sponsor-name');
            const gridElement = document.getElementById('logo-variants-grid');

            // Safety check for required properties
            if (!sponsor || !sponsor.name || !sponsor.year) {
                console.error('Invalid sponsor data:', sponsor);
                return;
            }

            nameElement.textContent = sponsor.name + ' - Logo Variants from ' + sponsor.year;

            // Build logo variants grid
            let variantsHtml = '';

            if (sponsor.logoUrlLightMode && sponsor.logoUrlLightMode !== '' && sponsor.logoUrlLightMode !== 'undefined') {
                variantsHtml += '<div class="logo-variant"><img src="' + sponsor.logoUrlLightMode + '" alt="Light Mode"><div>Light Mode</div></div>';
            }
            if (sponsor.logoUrlDarkMode && sponsor.logoUrlDarkMode !== '' && sponsor.logoUrlDarkMode !== 'undefined') {
                variantsHtml += '<div class="logo-variant"><img src="' + sponsor.logoUrlDarkMode + '" alt="Dark Mode" style="background: #333; padding: 10px;"><div>Dark Mode</div></div>';
            }

            if (!variantsHtml) {
                variantsHtml = '<div style="text-align: center; color: #666; grid-column: 1/-1;">No logo variants available for preview</div>';
            }

            gridElement.innerHTML = variantsHtml;
            modal.style.display = 'flex';
        }

        async function useExistingLogos() {
            if (selectedSponsor) {
                const currentYear = document.getElementById('year').value;

                // Show loading state
                const modal = document.getElementById('logo-preview-modal');
                const originalContent = modal.innerHTML;
                modal.innerHTML = '<div style="text-align: center; padding: 50px; color: white;"><div>Copying logo files...</div></div>';

                try {
                    // Copy logo files to new year
                    const response = await fetch('/api/copy-logos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sponsor: selectedSponsor,
                            toYear: currentYear
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        fillSponsorForm(selectedSponsor, true, result.copiedFiles);
                        closeLogoModal();
                    } else {
                        alert('Error copying logos: ' + result.error);
                        modal.innerHTML = originalContent;
                    }
                } catch (error) {
                    alert('Error copying logos: ' + error.message);
                    modal.innerHTML = originalContent;
                }
            }
        }

        function needNewLogos() {
            if (selectedSponsor) {
                fillSponsorForm(selectedSponsor, false);
                closeLogoModal();
                // Focus on logo upload
                setTimeout(() => {
                    document.getElementById('logo').focus();
                }, 100);
            }
        }

        function closeLogoModal() {
            document.getElementById('logo-preview-modal').style.display = 'none';
            selectedSponsor = null;
        }

        function fillSponsorForm(sponsor, copyLogos, copiedFiles) {
            currentPortalImport = null; // manual prefill, not a portal import
            // Fill form with sponsor data
            document.getElementById('name').value = sponsor.name || '';
            document.getElementById('website').value = sponsor.website || '';
            document.getElementById('tier').value = sponsor.tier || 'gold';
            document.getElementById('quote').value = (sponsor.quote && sponsor.quote !== 'undefined') ? sponsor.quote : '';

            // Clear search
            document.getElementById('sponsor-search').value = '';
            document.getElementById('sponsor-results').innerHTML = '';

            // Enable save button if logos were copied successfully
            const saveBtn = document.getElementById('save-btn');
            if (copyLogos && copiedFiles && copiedFiles.length > 0) {
                saveBtn.disabled = false;
                // Show preview section
                document.getElementById('preview-section').style.display = 'block';
                // Update preview grid to show that logos are ready
                document.getElementById('preview-grid').innerHTML =
                    '<div class="preview-item" style="text-align: center; grid-column: span 5;">' +
                        '<h4>✅ Logo files copied from ' + sponsor.year + '</h4>' +
                        '<p>Ready to save sponsor with existing logos</p>' +
                    '</div>';
            } else {
                saveBtn.disabled = true;
            }

            // Show notification
            const notification = document.createElement('div');
            notification.className = 'success';
            if (copyLogos) {
                if (copiedFiles && copiedFiles.length > 0) {
                    notification.textContent = 'Success! Copied ' + copiedFiles.length + ' logo files from ' + sponsor.year + '. Click "Approve & Save" when ready.';
                } else {
                    notification.textContent = 'Sponsor details filled from ' + sponsor.year + '. Some logos could not be copied - you may need to upload new ones.';
                }
            } else {
                notification.textContent = 'Sponsor details filled from ' + sponsor.year + '. Please upload new logos.';
            }
            document.querySelector('.form-section').appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 8000);
        }

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#sponsor-search') && !e.target.closest('#sponsor-results')) {
                document.getElementById('sponsor-results').innerHTML = '';
            }
        });

        // Function to update sponsor logo
        async function updateSponsorLogo(sponsorName, year) {
            console.log('updateSponsorLogo called:', sponsorName, year);

            // Check if sponsor has existing logo files
            try {
                const response = await fetch('/api/check-logo/' + year + '/' + encodeURIComponent(sponsorName));

                if (!response.ok) {
                    throw new Error('Failed to check logos: ' + response.status);
                }

                const result = await response.json();
                console.log('Logo check result:', result);

                if (result.existingLogos && result.existingLogos.length > 0) {
                    // Show existing logo options with choice to reprocess or upload new
                    const choice = confirm(
                        'Found ' + result.existingLogos.length + ' existing logo files for ' + sponsorName + ' (' + year + ')\\n\\n' +
                        'Click OK to reprocess existing logo with new approach\\n' +
                        'Click Cancel to upload a completely new logo'
                    );

                    if (choice) {
                        // Reprocess existing logo
                        await reprocessExistingLogo(sponsorName, year, result.existingLogos[0]);
                    } else {
                        // Allow uploading new logo - prefill form and switch to Add tab
                        prefillSponsorForm(sponsorName, year);
                        showTab('add');
                        showNotification('Switched to Add Sponsor tab. Form pre-filled for ' + sponsorName + ' (' + year + ')', 'info');
                    }
                } else {
                    // No existing logo, switch to Add tab and prefill
                    showNotification('No existing logos found for ' + sponsorName + ' (' + year + '). Opening Add Sponsor tab.', 'info');
                    prefillSponsorForm(sponsorName, year);
                    showTab('add');
                }
            } catch (error) {
                console.error('Error checking logos:', error);
                showNotification('Error checking existing logos: ' + error.message + '. Opening Add Sponsor tab.', 'error');
                // Fallback to prefill form
                prefillSponsorForm(sponsorName, year);
                showTab('add');
            }
        }

        // Helper function to show notifications
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            const bgColor = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007cba';
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: ' + bgColor + '; color: white; padding: 15px; border-radius: 5px; z-index: 9999; max-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 4000);
        }

        // Function to reprocess existing logo
        async function reprocessExistingLogo(sponsorName, year, existingLogo) {
            const statusDiv = document.createElement('div');
            statusDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #007cba; color: white; padding: 15px; border-radius: 5px; z-index: 9999;';
            statusDiv.textContent = 'Reprocessing ' + sponsorName + ' logo...';
            document.body.appendChild(statusDiv);

            try {
                const response = await fetch('/api/reprocess-logo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sponsorName: sponsorName,
                        year: year,
                        existingLogo: existingLogo
                    })
                });

                if (!response.ok) {
                    throw new Error('Server error: ' + response.status);
                }

                const result = await response.json();

                if (result.success) {
                    statusDiv.style.background = '#28a745';
                    statusDiv.textContent = '✅ Logo reprocessed successfully!';
                    setTimeout(() => {
                        document.body.removeChild(statusDiv);
                        loadSponsors(); // Refresh the view
                    }, 2000);
                } else {
                    statusDiv.style.background = '#dc3545';
                    statusDiv.textContent = '❌ Error: ' + (result.error || 'Unknown error');
                    setTimeout(() => document.body.removeChild(statusDiv), 4000);
                }
            } catch (error) {
                statusDiv.style.background = '#dc3545';
                statusDiv.textContent = '❌ Error: ' + error.message;
                setTimeout(() => document.body.removeChild(statusDiv), 4000);
            }
        }

        // Function to prefill sponsor form
        function prefillSponsorForm(sponsorName, year) {
            currentPortalImport = null; // manual prefill, not a portal import
            document.getElementById('name').value = sponsorName;
            document.getElementById('year').value = year;

            // Clear any existing search results
            document.getElementById('sponsor-results').innerHTML = '';
            document.getElementById('sponsor-search').value = '';
        }

        // Load sponsors on page load
        window.addEventListener('load', () => {
            loadSponsors();
        });
    </script>
</body>
</html>`
}

// HTTP Server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true)
    const pathname = parsedUrl.pathname
    const method = req.method

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
    }

    try {
        if (pathname === '/' && method === 'GET') {
            // Serve the HTML interface
            const years = await getAvailableYears()
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(getHTML(years))
        } else if (pathname.startsWith('/images/sponsors/') && method === 'GET') {
            // Serve sponsor logo files
            const filename = pathname.split('/').pop()
            const filepath = path.join(SPONSORS_DIR, filename)

            try {
                await fs.access(filepath)
                const fileContent = await fs.readFile(filepath)
                const ext = path.extname(filename).toLowerCase()

                let contentType = 'application/octet-stream'
                if (ext === '.svg') {
                    contentType = 'image/svg+xml'
                } else if (ext === '.png') {
                    contentType = 'image/png'
                } else if (ext === '.jpg' || ext === '.jpeg') {
                    contentType = 'image/jpeg'
                }

                res.writeHead(200, { 'Content-Type': contentType })
                res.end(fileContent)
            } catch (error) {
                res.writeHead(404, { 'Content-Type': 'text/plain' })
                res.end('Logo file not found')
            }
        } else if (pathname === '/api/debug/config' && method === 'GET') {
            // Debug endpoint to check raw config content
            const year = parsedUrl.query.year || (await getAvailableYears())[0]
            const configContent = await readYearConfig(year)

            if (configContent) {
                // Extract just the sponsors section for debugging
                const sponsorsMatch = configContent.match(/sponsors:\s*{([\s\S]*?)},?\s*\w+:/)
                const sponsorsSection = sponsorsMatch ? sponsorsMatch[1] : 'Not found'

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(
                    JSON.stringify({
                        year,
                        found: !!sponsorsMatch,
                        sponsorsSection: sponsorsSection.substring(0, 1000) + '...',
                        fullLength: configContent.length,
                    }),
                )
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Year not found' }))
            }
        } else if (pathname === '/api/sponsors/search' && method === 'GET') {
            // Search sponsors across all years
            const query = parsedUrl.query.q || ''
            const currentYear = parsedUrl.query.exclude || ''

            if (!query || query.length < 2) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify([]))
                return
            }

            const results = []
            const years = await getAvailableYears()

            for (const year of years) {
                if (year === currentYear) continue // Don't search current year

                try {
                    const sponsors = await getSponsorsByYear(year)
                    if (sponsors) {
                        for (const [tier, tierSponsors] of Object.entries(sponsors)) {
                            for (const sponsor of tierSponsors) {
                                if (sponsor.name && sponsor.name.toLowerCase().includes(query.toLowerCase())) {
                                    results.push({
                                        ...sponsor,
                                        year: year,
                                        tier: tier,
                                    })
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Skip years that don't have config files
                    print.warning(`Skipping year ${year}: ${error.message}`)
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(results.slice(0, 10))) // Limit to 10 results
        } else if (pathname.startsWith('/api/sponsors/') && method === 'GET') {
            // Get sponsors for a specific year using improved parsing
            const year = pathname.split('/')[3]
            const sponsors = await getSponsorsByYear(year)

            if (sponsors) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(sponsors))
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Year not found or no sponsors' }))
            }
        } else if (pathname === '/api/process-logo' && method === 'POST') {
            // Process uploaded logo
            let body = Buffer.alloc(0)

            req.on('data', (chunk) => {
                body = Buffer.concat([body, chunk])
            })

            req.on('end', async () => {
                try {
                    const contentType = req.headers['content-type']
                    const boundary = contentType.split('boundary=')[1]
                    const { files } = parseMultipart(body.toString('binary'), boundary)

                    if (files.logo) {
                        const result = await processLogo(files.logo.data, files.logo.filename)
                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify(result))
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ success: false, error: 'No logo file uploaded' }))
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname === '/api/copy-logos' && method === 'POST') {
            // Copy existing logos to new year
            let body = Buffer.alloc(0)

            req.on('data', (chunk) => {
                body = Buffer.concat([body, chunk])
            })

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body.toString())
                    const { sponsor, toYear } = data

                    if (!sponsor || !toYear) {
                        throw new Error('Missing sponsor or toYear')
                    }

                    const sponsorNameSlug = sponsor.name.toLowerCase().replace(/\s+/g, '-')
                    const variants = ['light', 'dark']
                    const copiedFiles = []

                    // Try to copy each variant
                    for (const variant of variants) {
                        const originalUrl = sponsor[`logoUrl${variant.charAt(0).toUpperCase() + variant.slice(1)}Mode`]

                        if (originalUrl) {
                            const originalFilename = originalUrl.split('/').pop()
                            const originalPath = path.join(SPONSORS_DIR, originalFilename)

                            try {
                                await fs.access(originalPath)
                                const ext = path.extname(originalFilename)
                                const newFilename = `${toYear}-${sponsorNameSlug}-${variant}${ext}`
                                const newPath = path.join(SPONSORS_DIR, newFilename)

                                await fs.copyFile(originalPath, newPath)
                                copiedFiles.push(newFilename)
                            } catch (copyError) {
                                print.warning(`Could not copy ${variant} logo: ${copyError.message}`)
                            }
                        }
                    }

                    print.success(`Copied ${copiedFiles.length} logo files for ${sponsor.name} to ${toYear}`)

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(
                        JSON.stringify({
                            success: true,
                            copiedFiles: copiedFiles,
                            message: `Copied ${copiedFiles.length} logo variants`,
                        }),
                    )
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname === '/api/sponsors' && method === 'POST') {
            // Save sponsor with processed logos
            let body = Buffer.alloc(0)

            req.on('data', (chunk) => {
                body = Buffer.concat([body, chunk])
            })

            req.on('end', async () => {
                try {
                    const contentType = req.headers['content-type']
                    const boundary = contentType.split('boundary=')[1]
                    const { parts, files } = parseMultipart(body.toString('binary'), boundary)

                    const { name, website, tier, quote, year, roomName, logoData } = parts
                    // Present when this save came through the Portal Import
                    // tab — carries the submission so we can track it.
                    const portalImport = parts.portalImport ? JSON.parse(parts.portalImport) : null

                    const { sponsorObj, jira } = await saveSponsor({
                        name,
                        website,
                        tier,
                        quote,
                        year,
                        roomName,
                        logos: logoData ? JSON.parse(logoData) : null,
                        uploadedFilename: files.logo?.filename,
                        portalImport,
                    })

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(
                        JSON.stringify({
                            success: true,
                            message: 'Sponsor processed successfully',
                            config: sponsorObj,
                            jira,
                        }),
                    )
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname === '/api/portal/submissions' && method === 'GET') {
            // List sponsor submissions from the deployed portal (remote D1)
            const env = parsedUrl.query.env
            if (!PORTAL_ENVS.includes(env)) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: `env must be one of: ${PORTAL_ENVS.join(', ')}` }))
                return
            }

            try {
                print.info(`Fetching portal submissions from ${env}…`)
                const submissions = await fetchPortalSubmissions(env)
                print.success(`Found ${submissions.length} sponsors in ${env}`)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(submissions))
            } catch (error) {
                print.error(`Portal fetch failed: ${error.message}`)
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: error.message }))
            }
        } else if (pathname === '/api/portal/import-logo' && method === 'POST') {
            // Download a submission's logo from remote R2 and run it through
            // the same processing as a manual upload — the response matches
            // /api/process-logo so the existing preview/save flow takes over.
            let body = Buffer.alloc(0)
            req.on('data', (chunk) => {
                body = Buffer.concat([body, chunk])
            })
            req.on('end', async () => {
                try {
                    const { env, r2Key, filename } = JSON.parse(body.toString())
                    if (!PORTAL_ENVS.includes(env) || !r2Key) {
                        throw new Error('env and r2Key are required')
                    }

                    const result = await processPortalLogo(env, r2Key, filename)

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify(result))
                } catch (error) {
                    print.error(`Portal logo import failed: ${error.message}`)
                    res.writeHead(502, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname.startsWith('/api/check-logo/') && method === 'GET') {
            // Check for existing logos: /api/check-logo/2025/MakerX
            const pathParts = pathname.split('/')
            const year = pathParts[3]
            const sponsorName = decodeURIComponent(pathParts[4])

            const sponsorNameSlug = sponsorName.toLowerCase().replace(/\s+/g, '-')
            const variants = ['light', 'dark']
            const extensions = ['svg', 'png']
            const existing = []

            for (const ext of extensions) {
                const filename = `${year}-${sponsorNameSlug}.${ext}`
                const filepath = path.join(SPONSORS_DIR, filename)
                try {
                    await fs.access(filepath)
                    existing.push({ extension: ext, filename, filepath })
                } catch {
                    console.log(`No file: ${filepath}`)
                    // File doesn't exist
                }
            }

            for (const variant of variants) {
                for (const ext of extensions) {
                    const filename = `${year}-${sponsorNameSlug}-${variant}.${ext}`
                    const filepath = path.join(SPONSORS_DIR, filename)
                    try {
                        await fs.access(filepath)
                        existing.push({ variant, extension: ext, filename, filepath })
                    } catch {
                        console.log(`No file: ${filepath}`)
                        // File doesn't exist
                    }
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ existingLogos: existing }))
        } else if (pathname === '/api/update-logo-config' && method === 'POST') {
            // Update sponsor logo URLs in config file
            let body = ''
            req.on('data', (chunk) => {
                body += chunk.toString()
            })

            req.on('end', async () => {
                try {
                    const { sponsorName, year, logoUrlDarkMode, logoUrlLightMode } = JSON.parse(body)

                    if (!sponsorName || !year || !logoUrlDarkMode || !logoUrlLightMode) {
                        throw new Error('Missing required fields: sponsorName, year, logoUrlDarkMode, logoUrlLightMode')
                    }

                    const updated = await updateSponsorLogoInConfig(
                        year,
                        sponsorName,
                        logoUrlDarkMode,
                        logoUrlLightMode,
                    )

                    if (updated) {
                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(
                            JSON.stringify({
                                success: true,
                                message: `Successfully updated logo URLs for ${sponsorName} in ${year} config`,
                            }),
                        )
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(
                            JSON.stringify({
                                success: false,
                                error: `Failed to update config for ${sponsorName} in ${year}`,
                            }),
                        )
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname === '/api/reprocess-logo' && method === 'POST') {
            // Reprocess existing logo
            let body = ''
            req.on('data', (chunk) => {
                body += chunk.toString()
            })

            req.on('end', async () => {
                try {
                    const { sponsorName, year, existingLogo } = JSON.parse(body)

                    // Read the existing logo file
                    const logoBuffer = await fs.readFile(existingLogo.filepath)

                    // Process it with the new two-step approach
                    const result = await processLogo(logoBuffer, existingLogo.filename)
                    console.log('Reprocess result:', result)
                    if (result.success) {
                        // Save the processed logos
                        const sponsorNameSlug = sponsorName.toLowerCase().replace(/\s+/g, '-')
                        const ext = existingLogo.extension

                        const lightPath = path.join(SPONSORS_DIR, `${year}-${sponsorNameSlug}-light.${ext}`)
                        const darkPath = path.join(SPONSORS_DIR, `${year}-${sponsorNameSlug}-dark.${ext}`)

                        // Convert base64 back to buffer and save
                        let lightBuffer, darkBuffer

                        if (result.light && typeof result.light === 'string') {
                            const lightBase64 = result.light.replace(/^data:image\/[^;]+;base64,/, '')
                            lightBuffer = Buffer.from(lightBase64, 'base64')
                        } else {
                            throw new Error('Invalid light data received')
                        }

                        if (result.dark && typeof result.dark === 'string') {
                            const darkBase64 = result.dark.replace(/^data:image\/[^;]+;base64,/, '')
                            darkBuffer = Buffer.from(darkBase64, 'base64')
                        } else {
                            throw new Error('Invalid dark data received')
                        }

                        await fs.writeFile(lightPath, lightBuffer)
                        await fs.writeFile(darkPath, darkBuffer)

                        print.success(`Reprocessed logos for ${sponsorName} (${year})`)
                        print.info(`Light mode: ${lightPath}`)
                        print.info(`Dark mode: ${darkPath}`)

                        // Update the config file with new logo URLs
                        const logoUrlLightMode = `/images/sponsors/${year}-${sponsorNameSlug}-light.${ext}`
                        const logoUrlDarkMode = `/images/sponsors/${year}-${sponsorNameSlug}-dark.${ext}`

                        const configUpdated = await updateSponsorLogoInConfig(
                            year,
                            sponsorName,
                            logoUrlDarkMode,
                            logoUrlLightMode,
                        )

                        if (configUpdated) {
                            print.success(`Updated config for ${sponsorName} with new logo URLs`)
                        } else {
                            print.warning(`Logo files saved but config update failed for ${sponsorName}`)
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(
                            JSON.stringify({
                                success: true,
                                message: 'Logo reprocessed successfully',
                                configUpdated: configUpdated,
                            }),
                        )
                    } else {
                        throw new Error(result.error || 'Processing failed')
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else {
            // 404 Not Found
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Not Found' }))
        }
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error.message }))
    }
})

function startUI() {
    server.listen(config.port, () => {
        print.success(`${config.appName} running at http://localhost:${config.port}`)
        print.info('Use this interface to:')
        print.info('• Add new sponsors with logo processing')
        print.info('• View existing sponsors by year')
        print.info('• Preview all logo variants before approval')
        print.info('• Generate TypeScript config snippets')
        print.info('')
        print.info(`Open http://localhost:${config.port} in your browser`)
    })

    process.on('SIGINT', () => {
        print.info('Shutting down server...')
        server.close(() => {
            print.success('Server stopped')
            process.exit(0)
        })
    })
}

// ---------------------------------------------------------------------------
// CLI: the same operations as the web UI, without a browser, so they can be
// scripted or run by an agent. Every command goes through saveSponsor() in
// lib/sponsor-ops.mjs, exactly like the UI's Approve & Save.
// ---------------------------------------------------------------------------

function slugify(name) {
    return name.toLowerCase().replace(/\s+/g, '-')
}

function assertTier(tier) {
    if (!SPONSOR_TIERS.includes(tier)) {
        throw new Error(`Unknown tier "${tier}". Expected one of: ${SPONSOR_TIERS.join(', ')}`)
    }
}

async function resolveQuote(options) {
    if (options.quoteFile) return (await fs.readFile(options.quoteFile, 'utf-8')).trim()
    return options.quote
}

// Dry runs write the processed variants somewhere reviewable instead of into
// the site, so the light/dark output can be checked before anything lands.
async function writePreview(logos, name, previewDir) {
    const dir = previewDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), `sponsor-preview-${slugify(name)}-`)))
    await fs.mkdir(dir, { recursive: true })
    const files = []
    for (const variant of ['light', 'dark']) {
        if (!logos?.[variant]) continue
        const ext = logos[variant].startsWith('data:image/svg') ? 'svg' : 'png'
        const file = path.join(dir, `${slugify(name)}-${variant}.${ext}`)
        await fs.writeFile(file, Buffer.from(logos[variant].split(',')[1], 'base64'))
        files.push(file)
    }
    return files
}

async function processLogoOrThrow(buffer, filename) {
    const result = await processLogo(buffer, filename)
    if (!result.success) throw new Error(result.error || `Could not process ${filename}`)
    return { light: result.light, dark: result.dark }
}

function output(options, result, lines) {
    if (options.json) {
        console.log(JSON.stringify(result, null, 2))
    } else {
        for (const line of lines) console.log(line)
    }
}

async function runSave(options, fields, logos) {
    if (options.dryRun) {
        const previews = logos ? await writePreview(logos, fields.name, options.previewDir) : []
        const result = { dryRun: true, ...fields, logos: undefined, portalImport: undefined, previews }
        output(options, result, [
            `Dry run — nothing written to the site. Would save "${fields.name}" as ${fields.tier} for ${fields.year}.`,
            ...previews.map((file) => `Preview: ${file}`),
        ])
        return
    }

    const { sponsorObj, existing, configUpdated, jira } = await saveSponsor({ ...fields, logos })
    if (!configUpdated) throw new Error(`Could not update ${yearConfigRelPath(fields.year)} — see the log above`)
    output(options, { sponsor: sponsorObj, updatedExisting: Boolean(existing), jira }, [
        `${existing ? 'Updated' : 'Added'} "${sponsorObj.name}" in ${yearConfigRelPath(fields.year)}`,
    ])
}

async function addCommand(options) {
    assertTier(options.tier)
    const logos = options.logo
        ? await processLogoOrThrow(await fs.readFile(options.logo), path.basename(options.logo))
        : null
    await runSave(
        options,
        {
            name: options.name,
            website: options.website,
            tier: options.tier,
            quote: await resolveQuote(options),
            year: options.year,
            roomName: options.roomName,
            uploadedFilename: options.logo,
        },
        logos,
    )
}

function requirePortalEnv(env) {
    if (!PORTAL_ENVS.includes(env)) throw new Error(`--env must be one of: ${PORTAL_ENVS.join(', ')}`)
}

async function portalListCommand(options) {
    requirePortalEnv(options.env)
    const submissions = (await fetchPortalSubmissions(options.env)).filter(
        (s) => !options.year || String(s.year) === String(options.year),
    )
    output(
        options,
        submissions,
        submissions.map(
            (s) =>
                `${s.issueKey}\t${s.year}\t${s.status}${s.changes.length ? ` (${s.changes.join(', ')})` : ''}\t` +
                `${s.name}\t${s.jiraTier ?? ''} → ${s.importedTier ?? s.suggestedTier ?? '?'}\t` +
                `${s.logoFilename ?? 'no logo'}`,
        ),
    )
}

async function portalImportCommand(issueKey, options) {
    requirePortalEnv(options.env)
    const submission = (await fetchPortalSubmissions(options.env)).find((s) => s.issueKey === issueKey)
    if (!submission) throw new Error(`No active portal submission for ${issueKey} in ${options.env}`)

    // Same defaults as the UI: updates keep the tier chosen last time, new
    // imports start from the Jira tier mapping.
    const tier = options.tier ?? submission.importedTier ?? submission.suggestedTier
    if (!tier) throw new Error(`No tier mapping for Jira tier "${submission.jiraTier}" — pass --tier`)
    assertTier(tier)

    let logos = null
    if (options.logo) {
        logos = await processLogoOrThrow(await fs.readFile(options.logo), path.basename(options.logo))
    } else if (submission.status === 'updated' && !submission.changes.includes('logo')) {
        print.info('Logo unchanged since last import — keeping the existing files.')
    } else if (submission.logoR2Key) {
        const result = await processPortalLogo(options.env, submission.logoR2Key, submission.logoFilename)
        if (!result.success) throw new Error(result.error || 'Logo processing failed')
        logos = { light: result.light, dark: result.dark }
    } else if (submission.status === 'new') {
        throw new Error(`${issueKey} has no logo in the portal yet — pass --logo <file>`)
    }

    await runSave(
        options,
        {
            name: options.name ?? submission.name,
            website: options.website ?? submission.website,
            tier,
            quote: (await resolveQuote(options)) ?? submission.quote,
            year: options.year ?? String(submission.year),
            roomName: options.roomName,
            portalImport: submission,
        },
        logos,
    )
}

function withErrors(action) {
    return async (...args) => {
        try {
            await action(...args)
        } catch (error) {
            print.error(error.message)
            process.exitCode = 1
        }
    }
}

const program = new Command()
program.name('sponsor:add').description(`${config.appName}. Run with no command to open the web UI.`).action(startUI)

program.command('ui').description(`Open the web UI on http://localhost:${config.port}`).action(startUI)

const commonSaveOptions = (command) =>
    command
        .option('--website <url>', 'Sponsor website')
        .option('--quote <text>', 'Sponsor quote shown on the sponsors page')
        .option('--quote-file <file>', 'Read the quote from a file (UTF-8)')
        .option(
            '--room-name <name>',
            "Room sponsors only; portal imports default to the issue's Exhibitor Room in Jira, else 'TBC'",
        )
        .option('--dry-run', 'Process logos into a preview directory; write nothing to the site')
        .option('--preview-dir <dir>', 'Where --dry-run writes the processed logo variants')
        .option('--json', 'Print the result as JSON on stdout (logs go to stderr)')

commonSaveOptions(
    program
        .command('add')
        .description('Add or update a sponsor from a local logo file')
        .requiredOption('--year <year>', 'Conference year, e.g. 2026')
        .requiredOption('--tier <tier>', `One of: ${SPONSOR_TIERS.join(', ')}`)
        .requiredOption('--name <name>', 'Sponsor name as shown on the site')
        .option('--logo <file>', 'Source logo (svg, png, jpg); processed into light/dark variants'),
).action(withErrors(addCommand))

const portal = program.command('portal').description('Sponsor portal submissions (reads D1/R2 via wrangler)')

portal
    .command('list')
    .description('List portal submissions and whether each is new, updated or imported')
    .requiredOption('--env <env>', PORTAL_ENVS.join(' | '))
    .option('--year <year>', 'Only this conference year')
    .option('--json', 'Print submissions as JSON')
    .action(withErrors(portalListCommand))

commonSaveOptions(
    portal
        .command('import <issueKey>')
        .description('Import a portal submission (e.g. SPN-24) into the site, like Portal Import → Approve & Save')
        .requiredOption('--env <env>', PORTAL_ENVS.join(' | '))
        .option('--tier <tier>', 'Override the tier (default: last import, else the Jira tier mapping)')
        .option('--year <year>', "Override the config year (default: the submission's year)")
        .option('--name <name>', 'Override the sponsor name')
        .option('--logo <file>', "Use this logo instead of the portal's"),
).action(withErrors(portalImportCommand))

// sponsor-manager.mjs imports this file to open the UI, with its own argv
// still in place — parsing that here would run its `add` as this CLI's.
const isEntryPoint = process.argv[1] && (await fs.realpath(process.argv[1])) === url.fileURLToPath(import.meta.url)
if (isEntryPoint) {
    await program.parseAsync(process.argv)
} else {
    startUI()
}
