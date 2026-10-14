// A ReactiveAdmin screen in MasterDetail: typical-admin-fabric's List in the
// list pane and its show/new/edit slots in the detail pane. Same props as
// ReactiveAdmin, plus a few for the list pane.
import React from 'react';
import ReactiveAdmin from '../../typical-admin-fabric';
import List from '../../typical-admin-fabric/List';
import type { IComponents, IDispatcher, ITACallBacks, ITASchema, Name } from '../../typical-admin';
import { MasterDetail } from './MasterDetail';
import { useDetailRoute } from './useDetailRoute';

export interface AdminMasterDetailProps {
  dispatcher: IDispatcher;
  name: Name;
  schemaDefinition: ITASchema;
  /** Slot overrides for the detail pane (show, new, edit, delete, links). */
  components?: Omit<IComponents, 'list'>;
  callBacks?: ITACallBacks;
  pageSize?: number;
  /** Heading of the list pane. Default `name.plural`. */
  title?: string;
  /** Compact list: only these columns of `schemaDefinition.list.columns`. */
  listColumns?: string[];
  /** Extra props for typical-admin-fabric's List (queryResultKey, idField, columnSelectable, ...). */
  listProps?: Record<string, any>;
  /** Detail pane content while nothing is selected. */
  empty?: React.ReactNode;
  listWidth?: number;
}

const NoList: React.FC = () => null;

export const AdminMasterDetail: React.FC<AdminMasterDetailProps> = ({
  dispatcher,
  name,
  schemaDefinition,
  components,
  callBacks,
  pageSize = 20,
  title,
  listColumns,
  listProps,
  empty,
  listWidth,
}) => {
  const route = useDetailRoute();

  const listSchema = React.useMemo(() => {
    if (!listColumns) return schemaDefinition.list;
    const columns: Record<string, any> = {};
    listColumns.forEach(k => {
      const col = (schemaDefinition.list.columns as Record<string, any>)[k];
      if (col) columns[k] = col;
    });
    return { ...schemaDefinition.list, columns };
  }, [schemaDefinition.list, listColumns]);

  // The Fluent List navigates on DetailsList's onActiveItemChanged, which
  // doesn't fire for the row that is already active. With the list staying
  // on screen, choosing the same row again after closing its detail would
  // do nothing, so the list is remounted each time the detail closes.
  const [listKey, setListKey] = React.useState(0);
  const wasSelected = React.useRef(route.selected);
  React.useEffect(() => {
    if (wasSelected.current && !route.selected) setListKey(k => k + 1);
    wasSelected.current = route.selected;
  }, [route.selected]);

  const detailComponents = React.useMemo(() => ({ ...components, list: NoList }), [components]);

  return (
    <MasterDetail
      title={title ?? name.plural}
      selected={route.selected}
      listUrl={route.basePath}
      empty={empty}
      listWidth={listWidth}
      list={
        <List
          key={listKey}
          dispatcher={dispatcher}
          name={name}
          schemaDefinition={listSchema}
          pageSize={pageSize}
          hideHeader
          basePath={route.basePath}
          {...listProps}
        />
      }
      detail={
        <ReactiveAdmin
          dispatcher={dispatcher}
          name={name}
          schemaDefinition={schemaDefinition}
          components={detailComponents}
          callBacks={callBacks}
        />
      }
    />
  );
};

export default AdminMasterDetail;
