import fs from 'fs';
import os from 'os';
import path from 'path';

import { test, expect } from '@playwright/test';

import {
  getAnsibleAapAuthFromEnv,
  loadAnsibleAapContextFromFile,
} from '@lib/app/auth/ansible-aap';

test.describe('ansible-aap auth', () => {
  test('loadAnsibleAapContextFromFile reads url and token from JSON', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-ansible-aap-'));
    const filePath = path.join(tmpDir, 'ansible-aap.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({ url: 'https://aap.example.com', token: 'secret-token' }),
      'utf8'
    );

    expect(loadAnsibleAapContextFromFile(filePath)).toEqual({
      url: 'https://aap.example.com',
      token: 'secret-token',
    });
  });

  test('getAnsibleAapAuthFromEnv prefers env over context file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-ansible-aap-env-'));
    const filePath = path.join(tmpDir, 'ansible-aap.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({ url: 'https://from-file.example.com', token: 'file-token' }),
      'utf8'
    );

    const prevUrl = process.env.ANSIBLE_URL;
    const prevToken = process.env.ANSIBLE_TOKEN;
    const prevPath = process.env.ANSIBLE_AAP_CONTEXT_PATH;

    process.env.ANSIBLE_AAP_CONTEXT_PATH = filePath;
    process.env.ANSIBLE_URL = 'https://from-env.example.com';
    process.env.ANSIBLE_TOKEN = 'env-token';

    try {
      const result = getAnsibleAapAuthFromEnv();
      expect(result).toMatchObject({
        configured: true,
        source: 'env',
        auth: { url: 'https://from-env.example.com', token: 'env-token' },
      });
    } finally {
      if (prevUrl === undefined) delete process.env.ANSIBLE_URL;
      else process.env.ANSIBLE_URL = prevUrl;
      if (prevToken === undefined) delete process.env.ANSIBLE_TOKEN;
      else process.env.ANSIBLE_TOKEN = prevToken;
      if (prevPath === undefined) delete process.env.ANSIBLE_AAP_CONTEXT_PATH;
      else process.env.ANSIBLE_AAP_CONTEXT_PATH = prevPath;
    }
  });

  test('getAnsibleAapAuthFromEnv falls back to context file when env vars empty', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-ansible-aap-fallback-'));
    const filePath = path.join(tmpDir, 'ansible-aap.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({ url: 'https://discovered.example.com', token: 'discovered-token' }),
      'utf8'
    );

    const prevUrl = process.env.ANSIBLE_URL;
    const prevToken = process.env.ANSIBLE_TOKEN;
    const prevPath = process.env.ANSIBLE_AAP_CONTEXT_PATH;

    process.env.ANSIBLE_AAP_CONTEXT_PATH = filePath;
    process.env.ANSIBLE_URL = '';
    process.env.ANSIBLE_TOKEN = '';

    try {
      const result = getAnsibleAapAuthFromEnv();
      expect(result).toMatchObject({
        configured: true,
        source: 'contextFile',
        auth: { url: 'https://discovered.example.com', token: 'discovered-token' },
      });
    } finally {
      if (prevUrl === undefined) delete process.env.ANSIBLE_URL;
      else process.env.ANSIBLE_URL = prevUrl;
      if (prevToken === undefined) delete process.env.ANSIBLE_TOKEN;
      else process.env.ANSIBLE_TOKEN = prevToken;
      if (prevPath === undefined) delete process.env.ANSIBLE_AAP_CONTEXT_PATH;
      else process.env.ANSIBLE_AAP_CONTEXT_PATH = prevPath;
    }
  });
});
