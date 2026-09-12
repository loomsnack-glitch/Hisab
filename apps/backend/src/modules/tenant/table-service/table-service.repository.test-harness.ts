import { mock } from "bun:test";

type TableServiceRepositoryMock = Record<string, ReturnType<typeof mock>>;

const noopAsync = () => mock(async () => null);

export const createTableServiceRepositoryMock = (
  overrides: TableServiceRepositoryMock = {},
): TableServiceRepositoryMock => ({
  getServiceTables: noopAsync(),
  getServiceTableById: noopAsync(),
  serviceTableLabelExists: noopAsync(),
  createServiceTable: noopAsync(),
  updateServiceTable: noopAsync(),
  transitionServiceTableState: noopAsync(),
  lockServiceTableForDevice: noopAsync(),
  attachTableOrder: noopAsync(),
  clearTableOrder: noopAsync(),
  attachCheckedOutSale: noopAsync(),
  attachDraftSale: noopAsync(),
  clearDraftSale: noopAsync(),
  releasePaidTableFromActiveState: noopAsync(),
  markReadyDraftAsEngaged: noopAsync(),
  setCommittedSaleTableState: noopAsync(),
  syncCommittedSalePaymentState: noopAsync(),
  lockServiceTableForSale: noopAsync(),
  releaseDueTable: noopAsync(),
  releasePaidTable: noopAsync(),
  assignServiceTableToArea: noopAsync(),
  unassignServiceTableFromArea: noopAsync(),
  lockServiceArea: noopAsync(),
  getServiceAreas: noopAsync(),
  getServiceAreaById: noopAsync(),
  serviceAreaTitleExists: noopAsync(),
  createServiceArea: noopAsync(),
  updateServiceArea: noopAsync(),
  deleteServiceArea: noopAsync(),
  reorderServiceAreas: noopAsync(),
  reorderServiceTables: noopAsync(),
  ...overrides,
});

export const installTableServiceRepositoryMock = (
  overrides: TableServiceRepositoryMock = {},
): TableServiceRepositoryMock => {
  const repositoryMock = createTableServiceRepositoryMock(overrides);
  const factory = () => repositoryMock;

  mock.module("./table-service.repository", factory);
  mock.module(
    "@/modules/tenant/table-service/table-service.repository",
    factory,
  );

  return repositoryMock;
};
