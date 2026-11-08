const getTravelKeywords = () => {
    const keywordsData = [
        "cam on",
        "cảm ơn",
        "du",
        "lich",
        "di",
        "đi",
        "gia",
        "giá",
        "mùa",
        "nơi",
        "tốn",
        "chốn",
        "địa",
        "điểm",
        "di tích",
        "di",
        "gần",
        "thích",
        "đi",
        "nơi",
        "giá",
        "trải nghiệm",
        "tiền",
        "tốn",
        "phí",
        "du lịch",
        "khách sạn",
        "vé máy bay",
        "điểm đến",
        "kỳ nghỉ",
        "tour",
        "địa điểm",
        "chuyến đi",
        "ẩm thực",
        "thắng cảnh",
        "quốc gia",
        "thành phố",
        "bãi biển",
        "núi",
        "hồ",
        "đảo",
        "di tích lịch sử",
        "văn hóa dân tộc",
        "hành hương",
        "đồ ăn địa phương",
        "thể thao mạo hiểm",
        "mua sắm",
        "thuê xe",
        "hướng dẫn viên",
        "tài liệu du lịch",
        "visa",
        "quy định an toàn",
        "điều kiện khí hậu",
        "dịch vụ du lịch",
        "kinh nghiệm du lịch",
        "dịch vụ hướng dẫn",
        "công ty du lịch",
        "tour du lịch tự túc",
        "tôi muốn đi chụp ảnh",
        "điểm check-in",
        "trải nghiệm du lịch",
        "đặt phòng khách sạn",
        "thực địa du lịch",
        "phương tiện di chuyển",
        "đặt tour du lịch",
        "hành trình du lịch",
        "visa du lịch",
        "chi phí du lịch",
        "an toàn du lịch",
        "bảo hiểm du lịch",
        "phương tiện công cộng",
        "cẩm nang du lịch",
        "nghỉ dưỡng",
        "khách sạn sang trọng",
        "homestay",
        "hostel",
        "khu vực vui chơi",
        "phương tiện cá nhân",
        "điểm đến thú vị",
        "văn hóa địa phương",
        "điểm tham quan",
        "địa điểm mua sắm",
        "món ăn địa phương",
        "nhà hàng địa phương",
        "sự kiện văn hóa",
        "hướng dẫn viên du lịch",
        "trang phục du lịch",
        "tiện nghi khách sạn",
        "bảo tàng",
        "du thuyền",
        "phà du lịch",
        "trải nghiệm dân dụ",
        "trải nghiệm văn hóa",
        "chợ đêm",
    ]
    return keywordsData
}

const checkTravelRelated = (message, keywords) => {
    if (typeof message !== 'string') {
        throw new Error('message must be a string');
    }
    for (const keyword of keywords) {
        if (message.includes(keyword)) {
            return true
        }
    }
    return false
}

function getDayOfWeek(dayIndex) {
    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return daysOfWeek[dayIndex];
}


export { getTravelKeywords, checkTravelRelated, getDayOfWeek }