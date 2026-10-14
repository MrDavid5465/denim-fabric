// The cross-feature Settings dialog, in Fluent: the core's useSettingsForm()
// does the work (General schema, extension tabs, one merged save); this file
// only draws it. Both shells use it.
import React from 'react';
import { Modal, Pivot, PivotItem, PrimaryButton, DefaultButton, Stack, getTheme } from '@fluentui/react';
import { useSettingsForm } from '../../denim';
import Form from '../../typical-admin-fabric/lib/templates/Form';
import { getStyle } from '../lib';

export interface SettingsDialogProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onDismiss }) => {
  const style = getStyle();
  const form = useSettingsForm(isOpen);

  const general = (
    <Stack tokens={{ childrenGap: '0.77em' }} style={{ paddingTop: '0.77em' }}>
      <Form
        form={form.general.schema}
        name={'userSettings'}
        initialValues={form.general.initialValues}
        onChange={form.general.onChange}
      />
    </Stack>
  );

  async function handleSave() {
    if (await form.save()) onDismiss();
  }

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} titleAriaId={'denim-settings-title'}>
      <Stack className={style.modalHeader}>
        <span id={'denim-settings-title'}>Settings</span>
      </Stack>
      <Stack className={style.modalBody}>
        <div style={{ width: '34em', maxWidth: '100%' }}>
          {form.tabs.length === 0 ? (
            general
          ) : (
            <Pivot>
              <PivotItem headerText="General" itemKey="general">
                {general}
              </PivotItem>
              {form.tabs.map(({ key, headerText, Component, props }) => (
                <PivotItem key={key} itemKey={key} headerText={headerText}>
                  <Stack style={{ paddingTop: '0.77em' }}>
                    <Component {...props} />
                  </Stack>
                </PivotItem>
              ))}
            </Pivot>
          )}
        </div>

        <Stack horizontal verticalAlign="center" wrap tokens={{ childrenGap: '0.77em' }} style={{ paddingTop: '1em' }}>
          <PrimaryButton onClick={handleSave} disabled={form.saving}>Save</PrimaryButton>
          <DefaultButton onClick={onDismiss}>Cancel</DefaultButton>
          {form.error && (
            <span role="alert" style={{ fontSize: '0.82em', color: getTheme().palette.redDark }}>{form.error}</span>
          )}
        </Stack>
      </Stack>
    </Modal>
  );
};

export default SettingsDialog;
