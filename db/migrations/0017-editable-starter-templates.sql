insert into page_templates (id, name, content) values
  ('00000000-0000-4000-8000-000000000001', 'Our story', $story$
  {"root":{"props":{}},"content":[
    {"type":"Section","props":{"id":"welcome","background":"sage","spacing":"spacious","content":[
      {"type":"Text","props":{"id":"welcome-title","text":"The moments we grow together","style":"h1","align":"left"}},
      {"type":"Text","props":{"id":"welcome-intro","text":"Little stories, gathered with love.","style":"p","align":"left"}}
    ]}},
    {"type":"Section","props":{"id":"memory","background":"paper","spacing":"comfortable","content":[
      {"type":"Columns","props":{"id":"memory-columns","ratio":"equal","gap":"comfortable","left":[
        {"type":"Text","props":{"id":"memory-title","text":"Our story","style":"h2","align":"left"}},
        {"type":"Text","props":{"id":"memory-copy","text":"It began with a little moment worth remembering.","style":"p","align":"left"}}
      ],"right":[
        {"type":"Image","props":{"id":"memory-image","alt":"A photograph from our garden","caption":"","fit":"cover","width":"inset"}}
      ]}}
    ]}}
  ]}
  $story$::jsonb),
  ('00000000-0000-4000-8000-000000000002', 'Garden journal', $journal$
  {"root":{"props":{}},"content":[
    {"type":"Section","props":{"id":"welcome","background":"sage","spacing":"spacious","content":[
      {"type":"Text","props":{"id":"welcome-title","text":"The moments we grow together","style":"h1","align":"left"}},
      {"type":"Text","props":{"id":"welcome-intro","text":"Little stories, gathered with love.","style":"p","align":"left"}}
    ]}},
    {"type":"Section","props":{"id":"journal","background":"paper","spacing":"comfortable","content":[
      {"type":"Image","props":{"id":"journal-image","alt":"A photograph from our garden","caption":"","fit":"cover","width":"inset"}},
      {"type":"Text","props":{"id":"journal-title","text":"A day to remember","style":"h2","align":"left"}},
      {"type":"Text","props":{"id":"journal-copy","text":"Write about the things you noticed today.","style":"p","align":"left"}}
    ]}}
  ]}
  $journal$::jsonb)
on conflict (id) do nothing;
