/* eslint-disable no-undef */
import { Logger } from '../support/logger';
import allure from '@wdio/allure-reporter';
import { CDPSession } from 'puppeteer';
import { browser } from '@wdio/globals';
import extensionUtils from './utils';

interface CountRequestOptions {
  targetTypes?: string[];
  printRequests?: boolean;
}

export class NetworkManager {
  private readonly NETWORK_ENABLE = 'Network.enable';
  private static cdpSessions: CDPSession[] = [];

  finishWithResponseCode = async (urlPattern: string, responseCode: number): Promise<any> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await browser.call(async () => {
        const puppeteer = await browser.getPuppeteer();
        const targets = puppeteer
          .targets()
          .filter((target) => ['page', 'service_worker', 'other'].includes(target.type()));
        targets.map(async (target) => {
          const client: CDPSession = (await target.createCDPSession()) as unknown as CDPSession;
          NetworkManager.cdpSessions.push(client);
          await client.send('Fetch.enable', {
            patterns: [{ urlPattern }]
          });
          client.on('Fetch.requestPaused', async ({ requestId, request }) => {
            Logger.log(`found request: ${request.url}, returning response code: ${responseCode} `);
            await client.send('Fetch.fulfillRequest', {
              requestId,
              responseCode: Number(responseCode),
              body: Buffer.from('{"__type": "Error"}').toString('base64')
            });
          });
        });
      });
    } else {
      Logger.log('request interception not available in Firefox');
    }
  };

  failRequest = async (urlPattern: string): Promise<any> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await browser.call(async () => {
        const puppeteer = await browser.getPuppeteer();
        const targets = puppeteer
          .targets()
          .filter((target) => ['page', 'service_worker', 'other'].includes(target.type()));
        targets.map(async (target) => {
          const client: CDPSession = (await target.createCDPSession()) as unknown as CDPSession;
          NetworkManager.cdpSessions.push(client);
          await client.send('Fetch.enable', {
            patterns: [{ urlPattern }]
          });
          client.on('Fetch.requestPaused', async ({ requestId, request }) => {
            Logger.log(`found request: ${request.url}, failing request`);
            await client.send('Fetch.failRequest', {
              requestId,
              errorReason: 'Failed'
            });
          });
        });
      });
    } else {
      Logger.log('request interception not available in Firefox');
    }
  };

  logFailedRequests = async (): Promise<void> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await browser.call(async () => {
        const puppeteer = await browser.getPuppeteer();
        const targets = puppeteer
          .targets()
          .filter(
            (target) => target.type() === 'page' || target.type() === 'service_worker' || target.type() === 'other'
          );
        targets.map(async (target) => {
          const client: CDPSession = (await target.createCDPSession()) as unknown as CDPSession;
          NetworkManager.cdpSessions.push(client);
          await client.send(this.NETWORK_ENABLE);
          client.on('Network.responseReceived', async (request) => {
            if (request.response.status >= 400) {
              const requestPayload = await this.getRequestPostData(client, request.requestId);
              const responseBody = await this.getResponseBody(client, request.requestId);
              const approximateTimestamp = new Date().toString();
              const combinedFailedRequestInfo = `URL:\n${request.response.url}\n\nRESPONSE CODE:\n${request.response.status}\n\nAPPROXIMATE TIME:\n${approximateTimestamp}\n\nRESPONSE BODY:\n${responseBody}\n\nREQUEST PAYLOAD:\n${requestPayload}`;
              allure.addAttachment('Failed request', combinedFailedRequestInfo, 'text/plain');
              console.error(
                'Failed request',
                `URL: ${request.response.url}  |  RESPONSE CODE: ${request.response.status}`
              );
            }
          });
        });
      });
    } else {
      Logger.log('requests logging not available in Firefox');
    }
  };

  private requestCount = 0;

  async countSentRequests(options: CountRequestOptions = {}): Promise<void> {
    if (!browser.isChromium) {
      Logger.log('Requests logging with CDP not available in non-chromium browsers');
      return;
    }

    const { targetTypes = ['page', 'service_worker', 'other'], printRequests = false } = options;

    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer.targets().filter((target) => targetTypes.includes(target.type()));

      await Promise.all(
        targets.map(async (target) => {
          try {
            const client = await target.createCDPSession();

            await client.send(this.NETWORK_ENABLE);
            client.on('Network.requestWillBeSent', (request) => {
              this.requestCount++;
              if (printRequests) {
                Logger.log(`Request #${this.requestCount}: ${request.request.url}`);
              }
            });
          } catch (error) {
            Logger.log(`CDP session error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
          }
        })
      );
    });
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  resetRequestCount(): void {
    this.requestCount = 0;
  }

  closeOpenedCdpSessions = async (): Promise<void> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      NetworkManager.cdpSessions.map(async (session) => {
        if (session.connection()) await session.detach();
      });
      NetworkManager.cdpSessions = [];
    }
  };

  private getRequestPostData = async (client: any, requestId: any): Promise<string> => {
    let postData = '';
    try {
      postData = JSON.stringify(await client.send('Network.getRequestPostData', { requestId }));
    } catch {
      /* empty */
    }
    return postData;
  };

  private getResponseBody = async (client: any, requestId: any): Promise<string> => {
    let responseBody = '';
    try {
      const getResponseBody = await client.send('Network.getResponseBody', { requestId });
      responseBody = getResponseBody.base64Encoded
        ? Buffer.from(getResponseBody.body, 'base64').toString('ascii')
        : getResponseBody.body;
    } catch (error) {
      Logger.warn(`${error}`);
    }
    return responseBody;
  };
}

export default new NetworkManager();
