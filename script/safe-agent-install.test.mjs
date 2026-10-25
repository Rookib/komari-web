import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { generateSafeAgentInstallCommand, SAFE_AGENT_INSTALL_URL } from '../src/utils/safeAgentInstall.ts';
import { quoteShellArgs } from '../src/utils/shellQuote.ts';
import { selectedNotificationChannels, notificationChannelSettings } from '../src/utils/notificationChannels.ts';

// Exercise a real POSIX parser, replacing network and elevation with harmless
// shell functions. No installer, network request, or privileged command runs.
function captureInstall(command) {
  const result = spawnSync('/bin/sh', ['-c', `curl() { :; }; sudo() { printf '%s\\0' "$@"; }; ${command}`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout.split('\0').slice(0, -1);
}

test('Linux node install keeps every credential and option one literal argument', () => {
  const args = ['-e', 'https://agent.example.test', '-t', "  a'\"$() `printf SHOULD_NOT_RUN >&2`;*\ntrailing  ", '--install-dir', '/opt/folder with spaces', '--install-service-name', 'komari-agent'];
  const command = generateSafeAgentInstallCommand(args);
  assert.ok(command.startsWith(`curl -fsSL ${SAFE_AGENT_INSTALL_URL} | sudo bash -s -- `));
  assert.deepEqual(captureInstall(command), ['bash', '-s', '--', ...args, '--disable-web-ssh', '--disable-auto-update']);
});

test('auto-discovery and SSH guard remain compatible with the reviewed installer', () => {
  const args = ['-e', 'https://agent.example.test', '--auto-discovery', 'discovery-key', '--ssh-auth-guard', '--ssh-auth-silent-mode', '--ssh-auth-aggregate-by-ip', '--ssh-auth-threshold', '5', '--ssh-auth-window', '60', '--ssh-auth-cooldown', '1800'];
  assert.deepEqual(captureInstall(generateSafeAgentInstallCommand(args)), ['bash', '-s', '--', ...args, '--disable-web-ssh', '--disable-auto-update']);
});

test('empty and metacharacter shell arguments survive without expansion', () => {
  const args = ['', ' x ', "quote'", '$HOME', '`printf INJECTED >&2`', '$(printf INJECTED >&2)', 'semi;colon', 'line\nbreak', '*', 'back\\slash'];
  const result = spawnSync('/bin/sh', ['-c', `printf '%s\\0' ${quoteShellArgs(args)}`], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(result.stdout.split('\0').slice(0, -1), args);
});

test('proxy URL remains quoted and cannot add another shell operation', () => {
  const args = ['-e', 'https://agent.example.test', '-t', 'test-token'];
  const command = generateSafeAgentInstallCommand(args, "https://proxy.example.test/';printf INJECTED >&2;'");
  assert.deepEqual(captureInstall(command), ['bash', '-s', '--', ...args, '--disable-web-ssh', '--disable-auto-update']);
  assert.match(generateSafeAgentInstallCommand(args, 'proxy.example.test/'), /https:\/\/proxy\.example\.test\/raw\.githubusercontent\.com\/Rookib\/tcpping/);
});

test('all three installation entry points use only the supported safe generator', () => {
  const index = readFileSync(new URL('../src/pages/admin/index.tsx', import.meta.url), 'utf8');
  const table = readFileSync(new URL('../src/components/admin/NodeTable/NodeFunction.tsx', import.meta.url), 'utf8');
  assert.equal((index.match(/return generateSafeAgentInstallCommand\(/g) || []).length, 2);
  assert.equal((table.match(/return generateSafeAgentInstallCommand\(/g) || []).length, 1);
  for (const source of [index, table]) {
    assert.doesNotMatch(source, /komari-monitor\/komari-agent|install\.ps1|--install-version|case "(?:windows|macos|docker)"/);
    assert.match(source, /safeLinuxOnly/);
  }
});

test('notification selection preserves multiple legacy channels and clears both setting forms', () => {
  assert.deepEqual(selectedNotificationChannels({ notification_method: 'telegram' }), ['telegram']);
  assert.deepEqual(selectedNotificationChannels({ notification_method: 'email', notification_methods: ['telegram', 'email', 'telegram'] }), ['telegram', 'email']);
  assert.deepEqual(notificationChannelSettings(['telegram', 'email']), { notification_methods: ['telegram', 'email'], notification_method: 'telegram' });
  assert.deepEqual(notificationChannelSettings([]), { notification_methods: [], notification_method: 'none' });
  assert.deepEqual(selectedNotificationChannels(notificationChannelSettings([])), []);
});
