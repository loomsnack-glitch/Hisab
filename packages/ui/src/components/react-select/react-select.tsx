/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import Select, { type ActionMeta, type GroupBase, type SelectInstance } from 'react-select';
import { defaultStyles, createClassNames } from './helper';
import { ClearIndicator, DropdownIndicator, MultiValueRemove, Option as OptionComponent } from './components';
export type Option = {
    label: string;
    value: unknown;
};

export type Options = readonly Option[];

type ReactSelectProps = {
    value: any;
    onChange: (newValue: any, actionMeta: ActionMeta<any>) => void;
    options: Options;
    styles?: Record<string, React.CSSProperties>;
    classNames?: Record<string, any>;
    components?: Record<string, React.ComponentType<any>>;
    isMulti?: boolean;
    isClearable?: boolean;
    placeholder?: string;
    isDisabled?: boolean;
    isLoading?: boolean;
    loadingMessage?: (obj: { inputValue: string }) => React.ReactNode;
    className?: string;
    ref?: React.Ref<SelectInstance<any, boolean, GroupBase<any>>>;
};


const ReactSelect = (props: ReactSelectProps) => {
    const {
        value,
        onChange,
        options = [],
        styles = defaultStyles,
        classNames = {},
        components = {},
        ...rest
    } = props;

    const mergedClassNames = createClassNames(classNames);

    return (
        <Select
            ref={props.ref}
            value={value}
            onChange={onChange}
            options={options}
            unstyled
            components={{
                DropdownIndicator,
                ClearIndicator,
                MultiValueRemove,
                Option: OptionComponent,
                ...components
            }}
            styles={styles}
            classNames={mergedClassNames}
            {...rest}
            // menuPosition='fixed'
            menuPlacement='auto'
        />
    );
};

ReactSelect.displayName = 'ReactSelect';

export default ReactSelect;