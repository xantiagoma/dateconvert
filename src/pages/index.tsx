import React, {FC, useState, useMemo, useEffect} from 'react';
import dynamic from 'next/dynamic';

import dayjs, {Dayjs} from 'dayjs';
import spacetime, {TimezoneMeta} from 'spacetime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import Layout, {Content} from 'antd/lib/layout/layout';
import Select from 'antd/lib/select';
import {useCallback} from 'react';
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
import PlusOutlined from '@ant-design/icons/lib/icons/PlusOutlined';
import Descriptions from 'antd/lib/descriptions';
import Statistic from 'antd/lib/statistic/Statistic';
import InputNumber from 'antd/lib/input-number';
import {Col, Row} from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Segmented from 'antd/lib/segmented';

spacetime.extend(soft);

const DatePicker = dynamic(() => import('../components/Datepicker'), {
  ssr: false,
});

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

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
  const [format, setFormat] = useState(
    'dddd MMMM Do YYYY hh:mm:ss.SSS A (z: UTCZ)',
  );
  const [showTZInfo, setShowTZInfo] = useState('Show');

  useEffect(() => {
    const tz = dayjs.tz.guess();
    setDate(dayjs().tz(tz));
    setTz(tz);
    setTimezones((s) => [...s, tz, 'America/New_York']);
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
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Select
                showSearch
                value={tz}
                onChange={changeTz}
                options={options}
                placeholder="Timezone"
                size="large"
                tagRender={tagRender}
                style={{width: '100%'}}
              />
            </Col>
            <Col xs={24} lg={8}>
              <DatePicker
                key={tz}
                value={day}
                onChange={(date) => setDate(dayjs.tz(date))}
                size="large"
                showTime
                allowClear={false}
                style={{width: '100%'}}
              />
            </Col>
          </Row>
          <Descriptions title="User Info">
            <Descriptions.Item>
              <Statistic
                title="Unix (seconds)"
                prefix={
                  <InputNumber
                    value={day.unix()}
                    size="large"
                    style={{width: '100%'}}
                    onChange={(unixS) => setDate(dayjs.tz(unixS * 1000))}
                  />
                }
                value=" "
                decimalSeparator=""
                groupSeparator=""
              />
            </Descriptions.Item>
            <Descriptions.Item>
              <Statistic title="ISO 8601" value={day.toISOString()} />
            </Descriptions.Item>
            <Descriptions.Item>
              <Statistic title="Default Format" value={day.format()} />
            </Descriptions.Item>
            <Descriptions.Item>
              <Statistic
                title="Unix Timestamp (milliseconds)"
                prefix={
                  <InputNumber
                    value={day.valueOf()}
                    size="large"
                    style={{width: '100%'}}
                    onChange={(unix) => setDate(dayjs.tz(unix))}
                  />
                }
                value=" "
                decimalSeparator=""
                groupSeparator=""
              />
            </Descriptions.Item>
            <Descriptions.Item>
              <Statistic title="UTC Person" value={day.toString()} />
            </Descriptions.Item>
            <Descriptions.Item>
              <Statistic
                title="Custom Format"
                valueStyle={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                prefix={
                  <Input
                    placeholder="Format"
                    style={{width: '100%'}}
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  />
                }
                suffix={
                  <small>
                    <a
                      href="https://day.js.org/docs/en/display/format"
                      rel="noreferrer noopenner"
                      target="_blank"
                    >
                      Format Tokens
                    </a>
                  </small>
                }
                value={day.format(format)}
              />
            </Descriptions.Item>
          </Descriptions>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Select
                size="large"
                mode="multiple"
                style={{width: '100%'}}
                placeholder="Timezones"
                options={options}
                value={timezones}
                onChange={setTimezones}
                tagRender={tagRender}
              />
            </Col>
            <Col xs={24} lg={8}>
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
                                <Tooltip
                                  title={`Select - ${iana}`}
                                  key="search"
                                >
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
            </Col>
          </Row>

          <List
            header={
              <Statistic
                title="Show Timezone Info"
                prefix={
                  <Segmented
                    options={['Show', 'Hide']}
                    value={showTZInfo}
                    onChange={(v) => setShowTZInfo(v as string)}
                  />
                }
                value=" "
              />
            }
            dataSource={spacetimes}
            renderItem={({timezone, day, spacetime, soft}) => (
              <List.Item key={timezone.name}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Statistic title="Timezone" value={timezone.name} />
                      <Statistic
                        title="has DST"
                        prefix={<BooleanIcon value={spacetime.hasDST()} />}
                        value=" "
                      />
                    </Space>
                  }
                  description={
                    <Space wrap align="start">
                      <Card>
                        <Statistic
                          title="Date"
                          value={spacetime.format('iso')}
                          valueStyle={{fontSize: 16}}
                        />
                        <Statistic
                          title="Format"
                          value={day.format(format)}
                          valueStyle={{fontSize: 16}}
                        />
                      </Card>
                      {showTZInfo === 'Show' && (
                        <>
                          <Card>
                            <Statistic
                              title="Date is DST"
                              value=" "
                              prefix={<BooleanIcon value={spacetime.isDST()} />}
                            />
                          </Card>
                          <Card>
                            <Statistic
                              title="Hemisphere"
                              value={spacetime.hemisphere()}
                            />
                          </Card>
                          {soft?.some((s) => s.standard?.name) && (
                            <Card>
                              <Statistic
                                title="Standard"
                                value=" "
                                prefix={
                                  <>
                                    {soft.map(({standard}) => (
                                      <TimezoneInfo
                                        key={standard?.name}
                                        {...standard}
                                      />
                                    ))}
                                  </>
                                }
                              />
                            </Card>
                          )}
                          {soft?.some((s) => s.daylight?.name) && (
                            <Card>
                              <Statistic
                                title="Daylight"
                                value=" "
                                prefix={
                                  <>
                                    {soft.map(({daylight}) => (
                                      <TimezoneInfo
                                        key={daylight?.name}
                                        {...daylight}
                                      />
                                    ))}
                                  </>
                                }
                              />
                            </Card>
                          )}
                        </>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Space>
      </Content>
    </Layout>
  );
};

export default Index;
