/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  INSUFFICIENT_FLEET_PERMISSIONS,
  ProjectMonitorFormatter,
} from './project_monitor_formatter';
import { LocationStatus } from '../../../common/runtime_types';
import { times } from 'lodash';
import { SyntheticsService } from '../synthetics_service';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { SyntheticsMonitorClient } from '../synthetics_monitor/synthetics_monitor_client';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { Subject } from 'rxjs';
import { formatSecrets } from '../utils';

import * as telemetryHooks from '../../routes/telemetry/monitor_upgrade_sender';

const testMonitors = [
  {
    type: 'browser',
    throttling: { download: 5, upload: 3, latency: 20 },
    schedule: 3,
    locations: [],
    privateLocations: ['Test private location'],
    params: { url: 'http://localhost:8080' },
    playwrightOptions: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      headless: true,
    },
    name: 'check if title is present 10 0',
    id: 'check if title is present 10 0',
    tags: [],
    content:
      'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAQAAAAYmFzaWMuam91cm5leS50c2WQQU7DQAxF9znFV8QiUUOmXcCCUMQl2NdMnWbKJDMaO6Ilyt0JASQkNv9Z1teTZWNAIqwP5kU4iZGOug863u7uDXsSddbIddCOl0kMX6iPnsVoOAYxryTO1ucwpoGvtUrm+hiSYsLProIoxwp8iWwVM9oUeuTP/9V5k7UhofCscNhj2yx4xN2CzabElOHXWRxsx/YNroU69QwniImFB8Vui5vJzYcKxYRIJ66WTNQL5hL7p1WD9aYi9zQOtgPFGPNqecJ1sCj+tAB6J6erpj4FDcW3qh6TL5u1Mq/8yjn7BFBLBwhGDIWc4QAAAEkBAABQSwECLQMUAAgACAAAACEARgyFnOEAAABJAQAAEAAAAAAAAAAAACAApIEAAAAAYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAD4AAAAfAQAAAAA=',
    filter: { match: 'check if title is present 10 0' },
  },
  {
    type: 'browser',
    throttling: { download: 5, upload: 3, latency: 20 },
    schedule: 3,
    locations: [],
    privateLocations: ['Test private location'],
    params: { url: 'http://localhost:8080' },
    playwrightOptions: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      headless: true,
    },
    name: 'check if title is present 10 1',
    id: 'check if title is present 10 1',
    tags: [],
    content:
      'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAQAAAAYmFzaWMuam91cm5leS50c2WQQU7DQAxF9znFV8QiUUOmXcCCUMQl2NdMnWbKJDMaO6Ilyt0JASQkNv9Z1teTZWNAIqwP5kU4iZGOug863u7uDXsSddbIddCOl0kMX6iPnsVoOAYxryTO1ucwpoGvtUrm+hiSYsLProIoxwp8iWwVM9oUeuTP/9V5k7UhofCscNhj2yx4xN2CzabElOHXWRxsx/YNroU69QwniImFB8Vui5vJzYcKxYRIJ66WTNQL5hL7p1WD9aYi9zQOtgPFGPNqecJ1sCj+tAB6J6erpj4FDcW3qh6TL5u1Mq/8yjn7BFBLBwhGDIWc4QAAAEkBAABQSwECLQMUAAgACAAAACEARgyFnOEAAABJAQAAEAAAAAAAAAAAACAApIEAAAAAYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAD4AAAAfAQAAAAA=',
    filter: { match: 'check if title is present 10 1' },
  },
];

const privateLocations = times(1).map((n) => {
  return {
    id: `loc-${n}`,
    label: 'Test private location',
    geo: {
      lat: 0,
      lon: 0,
    },
    isServiceManaged: false,
    agentPolicyId: `loc-${n}`,
    concurrentMonitors: 1,
  };
});

describe('ProjectMonitorFormatter', () => {
  const mockEsClient = {
    search: jest.fn(),
  };
  const logger = loggerMock.create();

  const kibanaRequest = httpServerMock.createKibanaRequest();

  const soClient = savedObjectsClientMock.create();

  const serverMock: UptimeServerSetup = {
    logger,
    uptimeEsClient: mockEsClient,
    authSavedObjectsClient: soClient,
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('test-space'),
      },
    },
  } as unknown as UptimeServerSetup;

  const syntheticsService = new SyntheticsService(serverMock);

  syntheticsService.addConfig = jest.fn();
  syntheticsService.editConfig = jest.fn();
  syntheticsService.deleteConfigs = jest.fn();

  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createStart().getClient();

  const locations = times(3).map((n) => {
    return {
      id: `loc-${n}`,
      label: `Location ${n}`,
      url: `https://example.com/${n}`,
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: true,
      status: LocationStatus.GA,
    };
  });

  const monitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  it('should return errors', async () => {
    const testSubject = new Subject();

    testSubject.next = jest.fn();

    const pushMonitorFormatter = new ProjectMonitorFormatter({
      projectId: 'test-project',
      spaceId: 'default-space',
      keepStale: false,
      locations,
      privateLocations,
      encryptedSavedObjectsClient,
      savedObjectsClient: soClient,
      monitors: testMonitors,
      server: serverMock,
      syntheticsMonitorClient: monitorClient,
      request: kibanaRequest,
      subject: testSubject,
    });

    pushMonitorFormatter.getProjectMonitorsForProject = jest.fn().mockResolvedValue([]);

    await pushMonitorFormatter.configureAllProjectMonitors();

    expect(testSubject.next).toHaveBeenNthCalledWith(
      1,
      'check if title is present 10 0: failed to create or update monitor'
    );
    expect(testSubject.next).toHaveBeenNthCalledWith(
      2,
      'check if title is present 10 1: failed to create or update monitor'
    );

    expect({
      createdMonitors: pushMonitorFormatter.createdMonitors,
      updatedMonitors: pushMonitorFormatter.updatedMonitors,
      staleMonitors: pushMonitorFormatter.staleMonitors,
      deletedMonitors: pushMonitorFormatter.deletedMonitors,
      failedMonitors: pushMonitorFormatter.failedMonitors,
      failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
    }).toStrictEqual({
      createdMonitors: [],
      deletedMonitors: [],
      failedMonitors: [
        {
          details: "Cannot read properties of undefined (reading 'authz')",
          id: 'check if title is present 10 0',
          payload: testMonitors[0],
          reason: 'Failed to create or update monitor',
        },
        {
          details: "Cannot read properties of undefined (reading 'authz')",
          id: 'check if title is present 10 1',
          payload: testMonitors[1],
          reason: 'Failed to create or update monitor',
        },
      ],
      failedStaleMonitors: [],
      staleMonitors: [],
      updatedMonitors: [],
    });
  });

  it('throws fleet permission error', async () => {
    const testSubject = new Subject();

    serverMock.fleet = {
      authz: {
        fromRequest: jest
          .fn()
          .mockResolvedValue({ integrations: { writeIntegrationPolicies: false } }),
      },
    } as any;

    const pushMonitorFormatter = new ProjectMonitorFormatter({
      projectId: 'test-project',
      spaceId: 'default-space',
      keepStale: false,
      locations,
      privateLocations,
      encryptedSavedObjectsClient,
      savedObjectsClient: soClient,
      monitors: testMonitors,
      server: serverMock,
      syntheticsMonitorClient: monitorClient,
      request: kibanaRequest,
      subject: testSubject,
    });

    pushMonitorFormatter.getProjectMonitorsForProject = jest.fn().mockResolvedValue([]);

    await pushMonitorFormatter.configureAllProjectMonitors();

    expect({
      createdMonitors: pushMonitorFormatter.createdMonitors,
      updatedMonitors: pushMonitorFormatter.updatedMonitors,
      staleMonitors: pushMonitorFormatter.staleMonitors,
      deletedMonitors: pushMonitorFormatter.deletedMonitors,
      failedMonitors: pushMonitorFormatter.failedMonitors,
      failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
    }).toStrictEqual({
      createdMonitors: [],
      deletedMonitors: [],
      failedMonitors: [
        {
          details: INSUFFICIENT_FLEET_PERMISSIONS,
          id: 'check if title is present 10 0',
          payload: testMonitors[0],
          reason: 'Failed to create or update monitor',
        },
        {
          details: INSUFFICIENT_FLEET_PERMISSIONS,
          id: 'check if title is present 10 1',
          payload: testMonitors[1],
          reason: 'Failed to create or update monitor',
        },
      ],
      failedStaleMonitors: [],
      staleMonitors: [],
      updatedMonitors: [],
    });
  });

  it('catches errors from bulk edit method', async () => {
    const testSubject = new Subject();

    serverMock.fleet = {
      authz: {
        fromRequest: jest
          .fn()
          .mockResolvedValue({ integrations: { writeIntegrationPolicies: true } }),
      },
    } as any;

    const pushMonitorFormatter = new ProjectMonitorFormatter({
      projectId: 'test-project',
      spaceId: 'default-space',
      keepStale: false,
      locations,
      privateLocations,
      encryptedSavedObjectsClient,
      savedObjectsClient: soClient,
      monitors: testMonitors,
      server: serverMock,
      syntheticsMonitorClient: monitorClient,
      request: kibanaRequest,
      subject: testSubject,
    });

    pushMonitorFormatter.getProjectMonitorsForProject = jest.fn().mockResolvedValue([]);

    await pushMonitorFormatter.configureAllProjectMonitors();

    expect({
      createdMonitors: pushMonitorFormatter.createdMonitors,
      updatedMonitors: pushMonitorFormatter.updatedMonitors,
      staleMonitors: pushMonitorFormatter.staleMonitors,
      deletedMonitors: pushMonitorFormatter.deletedMonitors,
      failedMonitors: pushMonitorFormatter.failedMonitors,
      failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
    }).toEqual({
      createdMonitors: [],
      updatedMonitors: [],
      staleMonitors: [],
      deletedMonitors: [],
      failedMonitors: [
        {
          details: "Cannot read properties of undefined (reading 'buildPackagePolicyFromPackage')",
          payload: payloadData,
          reason: 'Failed to create 2 monitors',
        },
      ],
      failedStaleMonitors: [],
    });
  });

  it('configures project monitors when there are errors', async () => {
    const testSubject = new Subject();

    serverMock.fleet = {
      authz: {
        fromRequest: jest
          .fn()
          .mockResolvedValue({ integrations: { writeIntegrationPolicies: true } }),
      },
    } as any;

    soClient.bulkCreate = jest.fn().mockResolvedValue({ saved_objects: [] });

    const pushMonitorFormatter = new ProjectMonitorFormatter({
      projectId: 'test-project',
      spaceId: 'default-space',
      keepStale: false,
      locations,
      privateLocations,
      encryptedSavedObjectsClient,
      savedObjectsClient: soClient,
      monitors: testMonitors,
      server: serverMock,
      syntheticsMonitorClient: monitorClient,
      request: kibanaRequest,
      subject: testSubject,
    });

    pushMonitorFormatter.getProjectMonitorsForProject = jest.fn().mockResolvedValue([]);

    await pushMonitorFormatter.configureAllProjectMonitors();

    expect({
      createdMonitors: pushMonitorFormatter.createdMonitors,
      updatedMonitors: pushMonitorFormatter.updatedMonitors,
      staleMonitors: pushMonitorFormatter.staleMonitors,
      deletedMonitors: pushMonitorFormatter.deletedMonitors,
      failedMonitors: pushMonitorFormatter.failedMonitors,
      failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
    }).toEqual({
      createdMonitors: [],
      updatedMonitors: [],
      staleMonitors: [],
      deletedMonitors: [],
      failedMonitors: [
        {
          details: "Cannot read properties of undefined (reading 'buildPackagePolicyFromPackage')",
          payload: payloadData,
          reason: 'Failed to create 2 monitors',
        },
      ],
      failedStaleMonitors: [],
    });
  });

  it('shows errors thrown by fleet api', async () => {
    const testSubject = new Subject();

    serverMock.fleet = {
      authz: {
        fromRequest: jest
          .fn()
          .mockResolvedValue({ integrations: { writeIntegrationPolicies: true } }),
      },
      packagePolicyService: {},
    } as any;

    soClient.bulkCreate = jest.fn().mockResolvedValue({ saved_objects: soResult });

    const pushMonitorFormatter = new ProjectMonitorFormatter({
      projectId: 'test-project',
      spaceId: 'default-space',
      keepStale: false,
      locations,
      privateLocations,
      encryptedSavedObjectsClient,
      savedObjectsClient: soClient,
      monitors: testMonitors,
      server: serverMock,
      syntheticsMonitorClient: monitorClient,
      request: kibanaRequest,
      subject: testSubject,
    });

    pushMonitorFormatter.getProjectMonitorsForProject = jest.fn().mockResolvedValue([]);

    await pushMonitorFormatter.configureAllProjectMonitors();

    expect({
      createdMonitors: pushMonitorFormatter.createdMonitors,
      updatedMonitors: pushMonitorFormatter.updatedMonitors,
      staleMonitors: pushMonitorFormatter.staleMonitors,
      deletedMonitors: pushMonitorFormatter.deletedMonitors,
      failedMonitors: pushMonitorFormatter.failedMonitors,
      failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
    }).toEqual({
      createdMonitors: [],
      updatedMonitors: [],
      staleMonitors: [],
      deletedMonitors: [],
      failedMonitors: [
        {
          details:
            'this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage is not a function',
          reason: 'Failed to create 2 monitors',
          payload: payloadData,
        },
      ],
      failedStaleMonitors: [],
    });
  });

  it('creates project monitors when no errors', async () => {
    const testSubject = new Subject();

    serverMock.fleet = {
      authz: {
        fromRequest: jest
          .fn()
          .mockResolvedValue({ integrations: { writeIntegrationPolicies: true } }),
      },
    } as any;

    soClient.bulkCreate = jest.fn().mockResolvedValue({ saved_objects: soResult });

    monitorClient.addMonitors = jest.fn().mockReturnValue({});

    const telemetrySpy = jest
      .spyOn(telemetryHooks, 'sendTelemetryEvents')
      .mockImplementation(jest.fn());

    const pushMonitorFormatter = new ProjectMonitorFormatter({
      projectId: 'test-project',
      spaceId: 'default-space',
      keepStale: false,
      locations,
      privateLocations,
      encryptedSavedObjectsClient,
      savedObjectsClient: soClient,
      monitors: testMonitors,
      server: serverMock,
      syntheticsMonitorClient: monitorClient,
      request: kibanaRequest,
      subject: testSubject,
    });

    pushMonitorFormatter.getProjectMonitorsForProject = jest.fn().mockResolvedValue([]);

    await pushMonitorFormatter.configureAllProjectMonitors();

    expect(soClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining(soData[0]),
        expect.objectContaining(soData[1]),
      ])
    );

    expect(telemetrySpy).toHaveBeenCalledTimes(2);

    expect({
      createdMonitors: pushMonitorFormatter.createdMonitors,
      updatedMonitors: pushMonitorFormatter.updatedMonitors,
      staleMonitors: pushMonitorFormatter.staleMonitors,
      deletedMonitors: pushMonitorFormatter.deletedMonitors,
      failedMonitors: pushMonitorFormatter.failedMonitors,
      failedStaleMonitors: pushMonitorFormatter.failedStaleMonitors,
    }).toEqual({
      createdMonitors: ['check if title is present 10 0', 'check if title is present 10 1'],
      updatedMonitors: [],
      staleMonitors: [],
      deletedMonitors: [],
      failedMonitors: [],
      failedStaleMonitors: [],
    });
  });
});

const payloadData = [
  {
    __ui: {
      is_zip_url_tls_enabled: false,
      script_source: {
        file_name: '',
        is_generated_script: false,
      },
    },
    config_id: '',
    custom_heartbeat_id: 'check if title is present 10 0-test-project-default-space',
    enabled: true,
    'filter_journeys.match': 'check if title is present 10 0',
    'filter_journeys.tags': [],
    form_monitor_type: 'multistep',
    ignore_https_errors: false,
    journey_id: 'check if title is present 10 0',
    locations: privateLocations,
    name: 'check if title is present 10 0',
    namespace: 'default_space',
    origin: 'project',
    original_space: 'default-space',
    params: '{"url":"http://localhost:8080"}',
    playwright_options:
      '{"userAgent":"Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1","viewport":{"width":375,"height":667},"deviceScaleFactor":2,"isMobile":true,"hasTouch":true,"headless":true}',
    playwright_text_assertion: '',
    project_id: 'test-project',
    schedule: {
      number: '3',
      unit: 'm',
    },
    screenshots: 'on',
    'service.name': '',
    'source.inline.script': '',
    'source.project.content':
      'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAQAAAAYmFzaWMuam91cm5leS50c2WQQU7DQAxF9znFV8QiUUOmXcCCUMQl2NdMnWbKJDMaO6Ilyt0JASQkNv9Z1teTZWNAIqwP5kU4iZGOug863u7uDXsSddbIddCOl0kMX6iPnsVoOAYxryTO1ucwpoGvtUrm+hiSYsLProIoxwp8iWwVM9oUeuTP/9V5k7UhofCscNhj2yx4xN2CzabElOHXWRxsx/YNroU69QwniImFB8Vui5vJzYcKxYRIJ66WTNQL5hL7p1WD9aYi9zQOtgPFGPNqecJ1sCj+tAB6J6erpj4FDcW3qh6TL5u1Mq/8yjn7BFBLBwhGDIWc4QAAAEkBAABQSwECLQMUAAgACAAAACEARgyFnOEAAABJAQAAEAAAAAAAAAAAACAApIEAAAAAYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAD4AAAAfAQAAAAA=',
    'source.zip_url.folder': '',
    'source.zip_url.password': '',
    'source.zip_url.proxy_url': '',
    'source.zip_url.url': '',
    'source.zip_url.ssl.certificate': undefined,
    'source.zip_url.username': '',
    'ssl.certificate': '',
    'ssl.certificate_authorities': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    'ssl.verification_mode': 'full',
    synthetics_args: [],
    tags: [],
    'throttling.config': '5d/3u/20l',
    'throttling.download_speed': '5',
    'throttling.is_enabled': true,
    'throttling.latency': '20',
    'throttling.upload_speed': '3',
    timeout: null,
    type: 'browser',
    'url.port': null,
    urls: '',
  },
  {
    __ui: {
      is_zip_url_tls_enabled: false,
      script_source: {
        file_name: '',
        is_generated_script: false,
      },
    },
    config_id: '',
    custom_heartbeat_id: 'check if title is present 10 1-test-project-default-space',
    enabled: true,
    'filter_journeys.match': 'check if title is present 10 1',
    'filter_journeys.tags': [],
    form_monitor_type: 'multistep',
    ignore_https_errors: false,
    journey_id: 'check if title is present 10 1',
    locations: privateLocations,
    name: 'check if title is present 10 1',
    namespace: 'default_space',
    origin: 'project',
    original_space: 'default-space',
    params: '{"url":"http://localhost:8080"}',
    playwright_options:
      '{"userAgent":"Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1","viewport":{"width":375,"height":667},"deviceScaleFactor":2,"isMobile":true,"hasTouch":true,"headless":true}',
    playwright_text_assertion: '',
    project_id: 'test-project',
    schedule: {
      number: '3',
      unit: 'm',
    },
    screenshots: 'on',
    'service.name': '',
    'source.inline.script': '',
    'source.project.content':
      'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAQAAAAYmFzaWMuam91cm5leS50c2WQQU7DQAxF9znFV8QiUUOmXcCCUMQl2NdMnWbKJDMaO6Ilyt0JASQkNv9Z1teTZWNAIqwP5kU4iZGOug863u7uDXsSddbIddCOl0kMX6iPnsVoOAYxryTO1ucwpoGvtUrm+hiSYsLProIoxwp8iWwVM9oUeuTP/9V5k7UhofCscNhj2yx4xN2CzabElOHXWRxsx/YNroU69QwniImFB8Vui5vJzYcKxYRIJ66WTNQL5hL7p1WD9aYi9zQOtgPFGPNqecJ1sCj+tAB6J6erpj4FDcW3qh6TL5u1Mq/8yjn7BFBLBwhGDIWc4QAAAEkBAABQSwECLQMUAAgACAAAACEARgyFnOEAAABJAQAAEAAAAAAAAAAAACAApIEAAAAAYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAD4AAAAfAQAAAAA=',
    'source.zip_url.folder': '',
    'source.zip_url.password': '',
    'source.zip_url.proxy_url': '',
    'source.zip_url.url': '',
    'source.zip_url.username': '',
    'ssl.certificate': '',
    'ssl.certificate_authorities': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    'ssl.verification_mode': 'full',
    synthetics_args: [],
    tags: [],
    'throttling.config': '5d/3u/20l',
    'throttling.download_speed': '5',
    'throttling.is_enabled': true,
    'throttling.latency': '20',
    'throttling.upload_speed': '3',
    timeout: null,
    type: 'browser',
    'url.port': null,
    urls: '',
  },
];

const soData = [
  {
    attributes: formatSecrets({
      ...payloadData[0],
      revision: 1,
    } as any),
    type: 'synthetics-monitor',
  },
  {
    attributes: formatSecrets({
      ...payloadData[1],
      revision: 1,
    } as any),
    type: 'synthetics-monitor',
  },
];

const soResult = soData.map((so) => ({ id: 'test-id', ...so }));
