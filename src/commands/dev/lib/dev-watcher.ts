import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import throttle from 'lodash.throttle';
import WebSocket from 'ws';

import { initWebsocket } from './dev-ws';
import getUser from '../../../util/get-user';
import Client from '../../../util/client';

import wait from '../../../util/output/wait';

import IGNORED from '../../../util/ignored';

import { Output } from '../../../util/output';
import { NowContext } from '../../../types';
import { DevWatcherOptions } from './types';

export default class devWatcher {
  private cwd: string;
  private ctx: NowContext;
  private output: Output;
  private watcher: chokidar.FSWatcher;
  private websocket: WebSocket;
  private devURL: string = '';

  constructor (cwd: string, options: DevWatcherOptions) {
    this.cwd = cwd;
    this.ctx = options.ctx;
    this.output = options.output;
    this.websocket = initWebsocket('http://localhost:3000/_now/ws');

    this.watcher = chokidar.watch(this.cwd, {
      ignored: createIgnoredList(this.cwd),
      ignoreInitial: true
    });
    this.watcher.on('all', this.onFsChange);

    process.on('SIGINT', this.onQuit);
  }

  start = async () => {
    await this.generateDevURL();
    this.output.log(`Your dev url is ${chalk.bold(this.devURL)}`);

    // first deployment
    await this.deploy();
  };

  onFsChange = (event: NodeJS.Events, _path: string) => {
    this.output.debug(`${event}: ${_path}`);
    this.deploy();
  };

  onQuit = () => {
    this.watcher.close();
    this.websocket.close(1000);
    console.log('stop dev-worker');
  };

  deploy = throttle(async () => {
    // TODO: verify project before do deployment
    console.time('> deployed');

    // TODO: collect files, verify files, send de
    this.websocket.send('NDC: Send files to dev-worker');

    console.timeEnd('> deployed');
  }, 3000);

  generateDevURL = async () => {
    const { apiUrl, authConfig } = this.ctx;
    const { token } = authConfig;

    const stopUserSpinner = wait('Fetching user information');
    const client = new Client({ apiUrl, token });
    const user = await getUser(client);

    stopUserSpinner();

    this.devURL = `project-name-dev-${user.username}.now.sh`;
  }
}

function createIgnoredList (cwd: string) {
  const gitignore = readAsText(cwd, '.gitignore');
  const nowignore = readAsText(cwd, '.nowignore');
  return [
    IGNORED,
    gitignore,
    nowignore
  ].join('\n').split('\n').filter(Boolean);
}

function readAsText (cwd: string, filename: string) {
  const fsPath = path.join(cwd, filename);
  if (fs.existsSync(fsPath) && fs.statSync(fsPath).isFile()) {
    return fs.readFileSync(fsPath, 'utf8');
  }

  return ''
}
