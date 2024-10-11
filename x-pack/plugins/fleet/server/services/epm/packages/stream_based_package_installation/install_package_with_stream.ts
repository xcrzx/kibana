/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';

import type { IArchiveIterator, PackageInstallContext } from '../../../../../common/types';
import type { Installation, KibanaAssetReference, KibanaAssetType } from '../../../../types';
import type { ArchiveEntry } from '../../archive';
import { getPathParts } from '../../archive';
import type { ArchiveAsset } from '../../kibana/assets/install';
import {
  KibanaSavedObjectTypeMapping,
  createSavedObjectKibanaAsset,
  isKibanaAssetType,
  toAssetReference,
} from '../../kibana/assets/install';
import { deleteKibanaAssets } from '../remove';

interface InstallPackageWithStreamArgs {
  packageInstallContext: PackageInstallContext;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  installedPkg: SavedObject<Installation> | undefined;
}

const MAX_ASSETS_TO_INSTALL_IN_PARALLEL = 100;

export async function installPackageWithStream({
  installedPkg,
  savedObjectsClient,
  packageInstallContext,
}: InstallPackageWithStreamArgs): Promise<KibanaAssetReference[]> {
  const { packageInfo, archiveIterator } = packageInstallContext;

  // Get the currently installed package
  const existingAssetRefs = installedPkg?.attributes.installed_kibana ?? [];

  // Install the new Kibana assets
  const assetRefs: KibanaAssetReference[] = await installKibanaAssets(
    savedObjectsClient,
    archiveIterator
  );

  // Remove any existing assets that are not in the new package
  const newAssetRefKeys = new Set(assetRefs.map((asset) => `${asset.id}-${asset.type}`));
  const assetsToRemove = existingAssetRefs.filter(
    (existingAsset) => !newAssetRefKeys.has(`${existingAsset.id}-${existingAsset.type}`)
  );
  await deleteKibanaAssets({ installedObjects: assetsToRemove, packageInfo });

  return assetRefs;
}

async function installKibanaAssets(
  savedObjectsClient: SavedObjectsClientContract,
  archiveIterator: IArchiveIterator
) {
  const assetRefs: KibanaAssetReference[] = [];
  let batch: ArchiveAsset[] = [];

  await archiveIterator.traverseEntries(async ({ path, buffer }: ArchiveEntry) => {
    if (!buffer || !isKibanaAssetType(path)) {
      return;
    }
    const savedObject = JSON.parse(buffer.toString('utf8')) as ArchiveAsset;
    const assetType = getPathParts(path).type as KibanaAssetType;
    const soType = KibanaSavedObjectTypeMapping[assetType];
    if (savedObject.type !== soType) {
      return;
    }

    batch.push(savedObject);
    assetRefs.push(toAssetReference(savedObject));

    if (batch.length >= MAX_ASSETS_TO_INSTALL_IN_PARALLEL) {
      await bulkCreateSavedObjects({
        savedObjectsClient,
        kibanaAssets: batch,
        refresh: false,
      });
      batch = [];
    }
  });

  // install any remaining assets
  if (batch.length) {
    await bulkCreateSavedObjects({
      savedObjectsClient,
      kibanaAssets: batch,
      refresh: false,
    });
  }
  return assetRefs;
}

async function bulkCreateSavedObjects({
  savedObjectsClient,
  kibanaAssets,
  refresh,
}: {
  kibanaAssets: ArchiveAsset[];
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: boolean | 'wait_for';
}) {
  if (!kibanaAssets.length) {
    return [];
  }

  const toBeSavedObjects = kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset));

  const { saved_objects: createdSavedObjects } = await savedObjectsClient.bulkCreate(
    toBeSavedObjects,
    {
      // We only want to install new saved objects without overwriting existing ones
      overwrite: false,
      managed: true,
      refresh,
    }
  );

  return createdSavedObjects;
}
