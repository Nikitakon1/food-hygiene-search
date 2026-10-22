async function getData(path) {
  const response = await fetch(`https://api.ratings.food.gov.uk/${path}`, {
    headers: { 'x-api-version': '2', Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('The food ratings service is unavailable. Please try again.');
  return response.json();
}

export async function getBusinessTypes() {
  const data = await getData('BusinessTypes');
  if (!Array.isArray(data.businessTypes)) throw new Error('Unexpected business types response.');
  return data.businessTypes;
}

export async function getBusinessDetails(id) {
  const [business, descriptions] = await Promise.all([
    getData(`Establishments/${encodeURIComponent(id)}`),
    getData(`ScoreDescriptors?establishmentId=${encodeURIComponent(id)}`),
  ]);
  if (business?.FHRSID !== id || !Array.isArray(descriptions?.scoreDescriptors)) {
    throw new Error('Unexpected business details response.');
  }
  return { ...business, scoreDescriptors: descriptions.scoreDescriptors };
}

export async function searchBusinesses(name, address, pageNumber = 1, businessTypeId = '') {
  const query = new URLSearchParams({ name, address, pageNumber, pageSize: 10 });
  if (businessTypeId) query.set('businessTypeId', businessTypeId);
  const data = await getData(`Establishments?${query}`);
  if (!Array.isArray(data.establishments) || !Number.isInteger(data.meta?.totalPages)) {
    throw new Error('The food ratings service returned an unexpected response. Please try again.');
  }
  return data;
}
