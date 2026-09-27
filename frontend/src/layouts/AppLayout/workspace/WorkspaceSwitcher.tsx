import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AppDispatch, RootState } from '../../../store/configureStore';
import { setCurrentWorkspaceId } from '../../../store/modules/workspaces';

export default function WorkspaceSwitcher({ onOpenCreate }: { onOpenCreate: () => void }) {
    const { t } = useTranslation('common');
    const dispatch = useDispatch<AppDispatch>();
    const { listWorkspaces, currentWorkspaceId, isLoadingWorkspaces } = useSelector(
        (s: RootState) => s.workspaces,
    );

    const current = listWorkspaces.find((w) => w.workspace_id === currentWorkspaceId);

    const items: MenuProps['items'] = [
        {
            key: 'label',
            type: 'group',
            label: (
                <span className="text-micro font-extrabold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                    Workspaces
                </span>
            ),
        },
        ...(listWorkspaces.length === 0 && !isLoadingWorkspaces
            ? [
                  {
                      key: 'empty',
                      label: (
                          <span className="text-caption text-[var(--color-text-tertiary)]">
                              {t('workspace.noWorkspace')}
                          </span>
                      ),
                      disabled: true,
                  },
              ]
            : listWorkspaces.map((w) => ({
                  key: String(w.workspace_id),
                  label: (
                      <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
                          <span className="flex-1 truncate">{w.name}</span>
                          {w.workspace_id === currentWorkspaceId ? (
                              <Check className="h-4 w-4 text-[var(--color-primary)]" />
                          ) : null}
                      </div>
                  ),
                  onClick: () => dispatch(setCurrentWorkspaceId(w.workspace_id)),
              }))),
        { type: 'divider' },
        {
            key: 'create',
            label: t('workspace.createNew'),
            onClick: onOpenCreate,
        },
    ];

    return (
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomLeft">
            <button
                type="button"
                className="flex h-auto w-full cursor-pointer items-center justify-between gap-1 rounded-md border-none bg-transparent px-2 py-1.5 text-left hover:bg-[var(--color-primary-bg)]"
            >
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span className="truncate text-micro font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
                        Workspace
                    </span>
                    <span className="truncate text-caption font-bold text-[var(--color-on-surface)]">
                        {isLoadingWorkspaces
                            ? '...'
                            : current?.name ?? (listWorkspaces[0]?.name || t('workspace.noWorkspace'))}
                    </span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
            </button>
        </Dropdown>
    );
}
