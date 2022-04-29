import React, {FC, useState, useMemo, useEffect} from 'react';
import dynamic from 'next/dynamic';

import dayjs, {Dayjs} from 'dayjs';
import spacetime, {TimezoneMeta} from 'spacetime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Layout, {Content} from 'antd/lib/layout/layout';
import Select from 'antd/lib/select';
import {useCallback} from 'react';
import Table from 'antd/lib/table';
import Tag from 'antd/lib/tag';
import Input from 'antd/lib/input';

import soft from 'timezone-soft';
import {stringToColor as stc} from '@davidcmeier/string-to-color';
import Space from 'antd/lib/space';
import CheckCircleTwoTone from '@ant-design/icons/lib/icons/CheckCircleTwoTone';
import CloseCircleTwoTone from '@ant-design/icons/lib/icons/CloseCircleTwoTone';
import message from 'antd/lib/message';
import Modal from 'antd/lib/modal';
import List from 'antd/lib/list';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';
import CompressOutlined from '@ant-design/icons/lib/icons/CompressOutlined';
import PlusOutlined from '@ant-design/icons/lib/icons/PlusOutlined';

spacetime.extend(soft);

const DatePicker = dynamic(() => import('../components/Datepicker'), {
  ssr: false,
});

dayjs.extend(utc);
dayjs.extend(timezone);

const dstc = (value: any) =>
  stc(value, {
    limitColor: {
      red: {min: 20, max: 255},
      blue: {min: 20, max: 255},
      green: {min: 20, max: 255},
    },
  });

const TimezoneInfo = (props: {abbr?: string; name?: string; prefix?: string}) =>
  props?.name ? (
    <Tag color={dstc(props.name)} icon={props.prefix}>
      {props.name}
      {props.name !== props.abbr && <> ({props.abbr})</>}
    </Tag>
  ) : null;

const BooleanIcon = ({value}: {value: boolean}) => (
  <>
    {value && (
      <CheckCircleTwoTone twoToneColor="#87d068" style={{fontSize: '24px'}} />
    )}
    {!value && (
      <CloseCircleTwoTone twoToneColor="#f50" style={{fontSize: '24px'}} />
    )}
  </>
);

const s = spacetime();

const tzs = Object.keys(spacetime.timezones());

const map: Map<String, TimezoneMeta> = new Map(
  tzs.map((tz): [string, TimezoneMeta] => {
    const timezone = s.goto(tz).timezone();
    return [timezone.name, timezone];
  }),
);
const options = [...map.entries()].map(([key, tz]) => {
  const softs = soft(key.toString());
  return {
    label: (
      <>
        {key}{' '}
        {softs.map(({daylight, iana, standard}) => (
          <>
            {iana !== key && <Tag>IANA: {iana}</Tag>}
            {standard && <TimezoneInfo {...standard} prefix="Standard: " />}
            {daylight?.name && (
              <TimezoneInfo {...daylight} prefix="Daylight: " />
            )}
          </>
        ))}
      </>
    ),
    value: key,
  };
});

const Index: FC = () => {
  const [date, setDate] = useState<Dayjs>(null);
  const [tz, setTz] = useState('');
  const [timezones, setTimezones] = useState([]);
  const day = useMemo(() => dayjs.tz(date), [date, tz]);
  const rawDate = useMemo(() => date?.toDate(), [date]);

  useEffect(() => {
    const tz = dayjs.tz.guess();
    setDate(dayjs().tz(tz));
    setTz(tz);
  }, []);

  const changeTz = useCallback(
    (newTz) => {
      dayjs.tz.setDefault(newTz);
      setTz(newTz);
      setDate(date.tz(newTz));
    },
    [date, setTz],
  );

  const spacetimes = useMemo(
    () =>
      timezones.map((timezone) => {
        const _spacetime = spacetime(rawDate).goto(timezone);
        const _timezone = _spacetime.timezone();
        let day: Dayjs;
        let dayWithTz = true;
        try {
          day = dayjs.tz(_spacetime.toNativeDate(), _timezone.name);
        } catch (e) {
          dayWithTz = false;
          day = dayjs.tz(_spacetime.toNativeDate());
        }
        const _soft = soft(timezone);
        return {
          spacetime: _spacetime,
          timezone: _timezone,
          day,
          dayWithTz,
          soft: _soft,
        };
      }),
    [rawDate, timezones],
  );

  if (date === null) {
    return null;
  }

  function tagRender(props) {
    const {label, value, closable, onClose} = props;
    const onPreventMouseDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const color = dstc(value);
    return (
      <Tag
        color={color as any}
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{marginRight: 3}}
      >
        {value}
      </Tag>
    );
  }

  return (
    <Layout>
      <Content style={{minHeight: '100vh'}}>
        <Space direction="vertical" style={{width: '100%', padding: '1rem'}}>
          <Space
            wrap
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
            }}
          >
            <Select
              showSearch
              value={tz}
              onChange={changeTz}
              options={options}
              placeholder="Timezone"
              size="large"
              tagRender={tagRender}
              style={{flexGrow: 1, width: '100%'}}
            />
            <DatePicker
              key={tz}
              value={day}
              onChange={(date) => setDate(dayjs.tz(date))}
              size="large"
              showTime
              allowClear={false}
            />
          </Space>
          <Space
            direction="vertical"
            wrap
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr',
            }}
          >
            {date.toISOString()}
            {date.format()}
            {date.toDate().toString()}
          </Space>
          <Space
            wrap
            align="start"
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
            }}
          >
            <Select
              size="large"
              mode="multiple"
              style={{width: '100%'}}
              placeholder="Timezone"
              options={options}
              value={timezones}
              onChange={setTimezones}
              tagRender={tagRender}
            />
            <Input.Search
              size="large"
              placeholder="Search Custom Timezone"
              onSearch={(value) => {
                const results = soft(value);
                if (!results.length) {
                  message.error('Not timezone found');
                } else {
                  Modal.info({
                    title: 'Timezones found',
                    okText: 'Close',
                    cancelButtonProps: {disabled: true},
                    content: (
                      <List
                        dataSource={results}
                        renderItem={({iana, standard, daylight}) => (
                          <List.Item
                            actions={[
                              <Tooltip title={`Select - ${iana}`} key="search">
                                <Button
                                  type="dashed"
                                  shape="circle"
                                  icon={<PlusOutlined />}
                                  size="large"
                                  onClick={() => {
                                    //changeTz(iana);
                                    setTimezones((value) => [...value, iana]);
                                    Modal.destroyAll();
                                  }}
                                />
                              </Tooltip>,
                            ]}
                          >
                            <List.Item.Meta
                              title={iana}
                              description={
                                <Space direction="vertical">
                                  {standard && <TimezoneInfo {...standard} />}
                                  {daylight?.name && (
                                    <TimezoneInfo {...daylight} />
                                  )}
                                </Space>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ),
                  });
                }
              }}
            />
          </Space>
          <Table
            columns={[
              {
                title: 'Timezone',
                render: (text, {timezone}, index) => timezone.name,
              },
              {
                title: 'Timezone has DST',
                render: (text, {spacetime}, index) => (
                  <BooleanIcon value={spacetime.hasDST()} />
                ),
              },
              {
                title: 'Date',
                render: (text, {day, dayWithTz, spacetime}, index) =>
                  spacetime.format('iso'),
              },
              {
                title: 'Date is DST',
                render: (text, {spacetime}, index) => (
                  <BooleanIcon value={spacetime.isDST()} />
                ),
              },

              {
                title: 'Hemisphere',
                render: (text, {spacetime}, index) => spacetime.hemisphere(),
              },
              {
                title: 'Standard',
                render: (text, {soft}, index) => (
                  <>
                    {soft.map(({standard}) => (
                      <TimezoneInfo key={standard?.name} {...standard} />
                    ))}
                  </>
                ),
              },
              {
                title: 'Daylight',
                render: (text, {soft}, index) => (
                  <>
                    {soft.map(({daylight}) => (
                      <TimezoneInfo key={daylight?.name} {...daylight} />
                    ))}
                  </>
                ),
              },
            ]}
            dataSource={spacetimes}
          />
        </Space>
      </Content>
    </Layout>
  );
};

export default Index;
